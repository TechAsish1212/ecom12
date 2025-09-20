import database from "../database/db.js";
import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import { v2 as cloudinary } from 'cloudinary';

export const createProduct = catchAsyncError(async (req, res, next) => {
    // all details taking from seller or admin
    const { name, description, price, category, stock } = req.body;
    const created_by = req.user.id;

    // check the validation
    if ([name, description, price, category, stock].some((i) => !i || i?.trim() === "")) {
        return next(new ErrorHandler("Provide all the product details.", 400));
    }

    // product image 
    const uploadImage = [];

    if (req.files && req.files.images) {
        const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];

        for (const i of images) {
            const result = await cloudinary.uploader.upload(i.tempFilePath, {
                folder: "Ecommerce_product_Images",
                width: 1000,
                crop: "scale",
            });
            uploadImage.push({
                url: result.secure_url,
                public_id: result.public_id,
            })
        }
    }

    const product = await database.query(
        `INSERT INTO products (name, description, price, category, stock, images, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [name, description, price / 89, category, stock, JSON.stringify(uploadImage), created_by]
    )

    res.status(201).json({
        success: true,
        message: "Product created Successfully",
        product: product.rows[0],
    })
})

export const fetchAllProducts = catchAsyncError(async (req, res, next) => {
    const { availability, price, category, ratings, search } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const conditions = [];
    let values = [];
    let index = 1;

    let pagintionPlaceholders = {};

    // filter products by avaibility
    if (availability === 'in-stock') {
        conditions.push(`stock > 5`);
    }
    else if (availability === 'limited') {
        conditions.push(`stock >0 AND stock <=5`);
    }
    else if (availability === 'out-of-stock') {
        conditions.push(`stock=0`);
    }

    // Filter products by price
    if (price) {
        const [minPrice, maxPrice] = price.split("-");
        if (minPrice && maxPrice) {
            conditions.push(`price BETWEEN $${index} AND $${index + 1}`);
            values.push(minPrice, maxPrice);
            index+=2;
        }
    } 

    // filter products by category
    if(category){
        conditions.push(`category ILIKE $${index}`);
        values.push(`%${category}%`);
        index++;
    }

    // filter products by rating
    if(ratings){
        conditions.push(`ratings >= $${index}`);
        values.push(ratings);
        index++;
    }

    // Add search query
    if(search){
        conditions.push(`p.name ILIKE $${index} OR p.description ILIKE $${index}`);
        values.push(`%${search}%`)
    }

    const whereClause = conditions.length?`WHERE ${conditions.join(" AND ")}`:"";
    
    // get count of filter Products 
    const totalProductsResult=await database.query(
        `SELECT COUNT(*) FROM products p ${whereClause}`,values
    )

    const totalProducts = parseInt(totalProductsResult.rows[0].count);

    pagintionPlaceholders.limit=`$${index}`;
    values.push(limit);
    index++;

    pagintionPlaceholders.offset=`$${index}`;
    values.push(offset);
    index++;

    // fetch with reviews
    const query=`
        SELECT p.*,
        COUNT(r.id) AS review_count 
        FROM products p 
        LEFT JOIN product_reviews r ON p.id = r.product_id
        ${whereClause}
        GROUP BY p.id 
        ORDER BY p.created_at DESC
        LIMIT ${pagintionPlaceholders.limit}
        OFFSET ${pagintionPlaceholders.offset}
    `

    const result=await database.query(query,values);

    const newProductsQuery=`
        SELECT p.*,
        COUNT(r.id) AS rerview_count
        FROM products p
        LEFT JOIN product_reviews r ON p.id = r.product_id
        WHERE p.created_at >=NOW()-INTERVAL '30days'
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT 8
    `
    const newProductsResult=await database.query(newProductsQuery);

    // query for fetching top rating products(rating >=4)
    const topRatedQuery=`
        SELECT p.*,
        COUNT(r.id) AS rerview_count
        FROM products p
        LEFT JOIN product_reviews r ON p.id = r.product_id
        WHERE p.ratings >= 4.5
        GROUP BY p.id
        ORDER BY p.ratings DESC, p.created_at DESC
        LIMIT 8
    `
    const topRatedResult=await database.query(topRatedQuery);

    res.status(200).json({
        success:true,
        products:result.rows,
        totalProducts,
        newProducts:newProductsResult.rows,
        topRatedProducts:topRatedResult.rows,
    })
})