const express = require('express');
const axios = require('axios');

let books = require("./booksdb.js");

const public_users = express.Router();


// Task 1
// Get the book list available in the shop
public_users.get('/', function (req, res) {

    return res.status(200).json(JSON.stringify(books, null, 4));

});


// Task 2
// Get book details based on ISBN
public_users.get('/isbn/:isbn', function (req, res) {

    const isbn = req.params.isbn;

    return res.status(200).json(books[isbn]);

});


// Task 3
// Get book details based on author
public_users.get('/author/:author', function (req, res) {

    const author = req.params.author;

    let filteredBooks = {};

    Object.keys(books).forEach((key) => {

        if (books[key].author === author) {

            filteredBooks[key] = books[key];

        }

    });

    return res.status(200).json(filteredBooks);

});


// Task 4
// Get book details based on title
public_users.get('/title/:title', function (req, res) {

    const title = req.params.title;

    let filteredBooks = {};

    Object.keys(books).forEach((key) => {

        if (books[key].title === title) {

            filteredBooks[key] = books[key];

        }

    });

    return res.status(200).json(filteredBooks);

});


// Task 5
// Get book reviews
public_users.get('/review/:isbn', function (req, res) {

    const isbn = req.params.isbn;

    return res.status(200).json(books[isbn].reviews);

});


// Task 10
// Get all books using async-await with axios
public_users.get('/asyncbooks', async function (req, res) {

    try {

        const response = await axios.get('http://localhost:5000/');

        return res.status(200).json(response.data);

    } catch (error) {

        return res.status(500).json({ message: error.message });

    }

});


// Task 11
// Get book by ISBN using async-await with axios
public_users.get('/asyncisbn/:isbn', async function (req, res) {

    const isbn = req.params.isbn;

    try {

        const response = await axios.get(`http://localhost:5000/isbn/${isbn}`);

        return res.status(200).json(response.data);

    } catch (error) {

        return res.status(500).json({ message: error.message });

    }

});


// Task 12
// Get books by author using async-await with axios
public_users.get('/asyncauthor/:author', async function (req, res) {

    const author = req.params.author;

    try {

        const response = await axios.get(`http://localhost:5000/author/${author}`);

        return res.status(200).json(response.data);

    } catch (error) {

        return res.status(500).json({ message: error.message });

    }

});


// Task 13
// Get books by title using async-await with axios
public_users.get('/asynctitle/:title', async function (req, res) {

    const title = req.params.title;

    try {

        const response = await axios.get(`http://localhost:5000/title/${title}`);

        return res.status(200).json(response.data);

    } catch (error) {

        return res.status(500).json({ message: error.message });

    }

});


module.exports.general = public_users;