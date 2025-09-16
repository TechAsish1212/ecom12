import { createUser } from '../models/user.js';
import { createProduct } from '../models/product.js'; // Move this up!
import { createOrders } from '../models/orders.js';
import { createOrderItem } from '../models/orderItems.js';
import { createShippingInfo } from '../models/shippingInfo.js';
import { createProductReviews } from '../models/productReviews.js';
import { createPayments } from '../models/payments.js';

export const createTables = async () => {
    try {
        await createUser();
        await createProduct();
 
        await createOrders();
        await createOrderItem(); 
        await createProductReviews();
        
        await createShippingInfo();
        await createPayments();
        
        console.log("All tables created successfully!");
    } catch (error) {
        console.error("Error creating tables: ", error);
    }
}