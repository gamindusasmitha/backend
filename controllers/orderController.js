import Order from "../models/oder.js";
import Product from "../models/Product.js";

export function createOrder(req, res){

    if(req.user==null){
        req.status(401).json({
            messege : "Unauhtorized"
        });
        return
    }

    try{const latestOrder = await Order.findOne().sort({date:-1})

    let orderID = "ORD0001"

    if(latestOrder!= null){
        let latestOrderID = latestOrder.orderID;

        let latestOrderNumberString = latestOrderID.replace("ORD" , "")

        let latestOrderNumber = parseInt(latestOrderNumberString)

        let newOrderNumber = latestOrderNumber + 1

        let newOrderNumberString = newOrderNumber.toString().padStart(4,"0")

        orderID = "ORD" + newOrderNumberString 

        const items =[]
        let total =0

        for (let i=0 ; i<req.body.items.length;i++ ){

            const product = await Product.findOne({productID : req.body.items[i].productID})

            if(product == null){
                return res.status(400).json({
                    messege :"Product with ID ${req.body.items[i].productID} not found"
                })
            }

            items.push({
                productID : product.productID,
                name : product.name,
                price : product.price,
                quantity : req.body.items[i].quantity,
                image: product.images[0]
            })

            await Product.updateOne(
                {productID : product.productID},
                {stock : product.stock - req.body.items[i].quantity}
            )
        }
    }
    }catch(error){
        return res.status(500).json({
            messege : "Error placing order",
            error : error.messege
        })
    }

}

export async function updateOrderStatus(req,res) {

    if(!isAdmin(req)){
        res.status(401).json({
            messege : "Unauthorized"
        });
        return
    }
    try{
        const orderID = req.params.orderID
        const status = req.body.status

        await Order.updateOne(
            { orderID : orderID}
            {status : status, notes: notes}
        )

        res.json({
            messege : "Order updated succesfully"
        })
    }catch {
        res.status(500).json({
            messege : "Error updating products"
        })
    }
}