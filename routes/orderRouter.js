import express from "express";
import { createOrder, getAllOrders, updateOrderStatus } from "../controllers/orderController.js";

const orderRouter = express.Router();

orderRouter.post("/", createOrder);
orderRouter.put("/:orderID", updateOrderStatus);
orderRouter.get("/", getAllOrders);

export default orderRouter;