import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  removeFromCart,
  increaseQuantity,
  decreaseQuantity,
} from './CartSlice';

import './CartItem.css';

const CartItem = ({ onContinueShopping }) => {

  const cart = useSelector((state) => state.cart.cartItems);

  const dispatch = useDispatch();

  // Total amount of all products
  const calculateTotalAmount = () => {
    return cart
      .reduce((total, item) => total + item.price * item.quantity, 0)
      .toFixed(2);
  };

  // Continue shopping button
const handleContinueShopping = () => {
    onContinueShopping();
};

  // Increase quantity
  const handleIncrement = (item) => {
    dispatch(increaseQuantity(item.id));
  };

  // Decrease quantity
  const handleDecrement = (item) => {
    dispatch(decreaseQuantity(item.id));
  };

  // Remove item
  const handleRemove = (item) => {
    dispatch(removeFromCart(item.id));
  };

  // Total cost per item
  const calculateTotalCost = (item) => {
    return (item.price * item.quantity).toFixed(2);
  };

  return (
    <div className="cart-container">

      <h2 style={{ color: 'black' }}>
        Total Cart Amount: ${calculateTotalAmount()}
      </h2>

      <div>

        {cart.map((item) => (

          <div className="cart-item" key={item.id}>

            <img
              className="cart-item-image"
              src={item.image}
              alt={item.name}
            />

            <div className="cart-item-details">

              <div className="cart-item-name">
                {item.name}
              </div>

              <div className="cart-item-cost">
                Unit Price: ${item.price}
              </div>

              <div className="cart-item-quantity">

                <button
                  className="cart-item-button cart-item-button-dec"
                  onClick={() => handleDecrement(item)}
                >
                  -
                </button>

                <span className="cart-item-quantity-value">
                  {item.quantity}
                </span>

                <button
                  className="cart-item-button cart-item-button-inc"
                  onClick={() => handleIncrement(item)}
                >
                  +
                </button>

              </div>

              <div className="cart-item-total">
                Total: ${calculateTotalCost(item)}
              </div>

              <button
                className="cart-item-delete"
                onClick={() => handleRemove(item)}
              >
                Delete
              </button>

            </div>

          </div>

        ))}

      </div>

      <div
        style={{ marginTop: '20px', color: 'black' }}
        className='total_cart_amount'
      >
        Total Items: {cart.reduce((total, item) => total + item.quantity, 0)}
      </div>

      <div className="continue_shopping_btn">

        <button
          className="get-started-button"
          onClick={handleContinueShopping}
        >
          Continue Shopping
        </button>

        <br />

        <button
          className="get-started-button1"
          onClick={() => alert("Coming Soon")}
        >
          Checkout
        </button>

      </div>

    </div>
  );
};

export default CartItem;