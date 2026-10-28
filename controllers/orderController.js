import Order from "../models/oder.js"; // keep this the same as your real file name
import Product from "../models/Product.js";
import { isAdmin } from "./userController.js";

export async function createOrder(req, res) {
	// 1. CHECK: is the user logged in?
	if (req.user == null) {
		res.status(401).json({ message: "Unauthorized" });
		return;
	}

	try {
		const cartItems = req.body.items;

		if (!Array.isArray(cartItems) || cartItems.length === 0) {
			res.status(400).json({ message: "Your order has no items" });
			return;
		}

		// 2. Make the next order ID (ORD0001, ORD0002, ...)
		const latestOrder = await Order.findOne().sort({ date: -1 });

		let orderID = "ORD0001";

		if (latestOrder != null) {
			const latestNumber = parseInt(latestOrder.orderID.replace("ORD", ""));
			orderID = "ORD" + (latestNumber + 1).toString().padStart(4, "0");
		}

		// 3. BUILD: make the items from OUR database
		// (never trust a price that comes from the browser)
		const items = [];
		let total = 0;

		for (let i = 0; i < cartItems.length; i++) {
			const quantity = Number(cartItems[i].quantity);

			if (!Number.isInteger(quantity) || quantity < 1) {
				res.status(400).json({
					message: "Invalid quantity for " + cartItems[i].productID,
				});
				return;
			}

			const product = await Product.findOne({
				productID: cartItems[i].productID,
			});

			if (product == null) {
				res.status(400).json({
					message: `Product with ID ${cartItems[i].productID} not found`,
				});
				return;
			}

			if (product.stock < quantity) {
				res.status(400).json({
					message: `Not enough stock for ${product.name}. Only ${product.stock} left`,
				});
				return;
			}

			items.push({
				productID: product.productID,
				name: product.name,
				price: product.price,
				quantity: quantity,
				image: product.images?.[0],
			});

			total += product.price * quantity;
		}

		// 4. SAVE: write the order
		const order = new Order({
			orderID: orderID,
			email: req.user.email,
			name: req.body.name || req.user.firstName + " " + req.user.lastName,
			address: req.body.address,
			phone: req.body.phone,
			items: items,
			total: total,
		});

		await order.save();

		// 5. SUBTRACT: take the items off the shelf (only after the order is saved)
		for (const item of items) {
			await Product.updateOne(
				{ productID: item.productID },
				{ $inc: { stock: -item.quantity } }
			);
		}

		// 6. SAY: always send an answer
		res.json({
			message: "Order placed successfully",
			orderID: orderID,
			total: total,
		});
	} catch (error) {
		console.log(error);
		res.status(500).json({
			message: "Error placing order",
			error: error.message,
		});
	}
}

export async function updateOrderStatus(req, res) {
	if (!isAdmin(req)) {
		res.status(403).json({ message: "Only admin can update orders" });
		return;
	}

	try {
		const orderID = req.params.orderID;
		const status = req.body.status;
		const notes = req.body.notes;

		if (!status) {
			res.status(400).json({ message: "Status is required" });
			return;
		}

		const update = { status: status };

		if (notes !== undefined) {
			update.notes = notes;
		}

		const result = await Order.updateOne({ orderID: orderID }, update);

		if (result.matchedCount === 0) {
			res.status(404).json({ message: "Order not found: " + orderID });
			return;
		}

		res.json({ message: "Order updated successfully" });
	} catch (error) {
		console.log(error);
		res.status(500).json({
			message: "Error updating order",
			error: error.message,
		});
	}
}

export async function getAllOrders(req, res) {
	// 1. CHECK: only an admin can see all orders
	if (!isAdmin(req)) {
		res.status(403).json({
			message: "Only admin can view all orders",
		});
		return;
	}

	try {
		// 2. GET: newest orders first
		const orders = await Order.find().sort({ date: -1 });

		// 3. SAY: send the orders back
		res.json(orders);
	} catch (error) {
		console.log(error);
		res.status(500).json({
			message: "Error getting orders",
			error: error.message,
		});
	}
}