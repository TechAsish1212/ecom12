// export const catchAsyncError = (thisFunction) => {
//     return (req, res, next) => {
//         Promise.resolve(thisFunction(req, res, next))
//             .catch(next);
//     }
// }
export const catchAsyncError = (reqestHandler)=>{
    return (req,res,next)=>{
        Promise.resolve(reqestHandler(req,res,next))
        .catch((err)=>next(err))
    }
}
