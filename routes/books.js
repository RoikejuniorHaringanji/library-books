const express = require('express');
const router = express.Router();
const db = require('../data/database');
const Book = require('../models/Book');
const { isAuthenticated } = require('../middleware/authenticate');

/**
 * @openapi
 * components:
 *   schemas:
 *     Book:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB ObjectId
 *         title:
 *           type: string
 *         authorId:
 *           type: string
 *         publishedDate:
 *           type: string
 *           format: date
 *         pages:
 *           type: integer
 *       required:
 *         - title
 *         - authorId
 *
 * /books:
 *   get:
 *     summary: Get all books
 *     tags:
 *       - Books
 *     responses:
 *       '200':
 *         description: Successfully retrieved all books
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Book'
 *       '500':
 *         description: Internal Server Error
 *
 *   post:
 *     summary: Create a new book
 *     tags:
 *       - Books
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               authorId:
 *                 type: string
 *               publishedDate:
 *                 type: string
 *                 format: date
 *               pages:
 *                 type: integer
 *             required:
 *               - title
 *               - authorId
 *     responses:
 *       '201':
 *         description: Book created
 *       '400':
 *         description: Bad Request
 *       '500':
 *         description: Internal Server Error
 *
 * /books/{id}:
 *   get:
 *     summary: Get a single book by ID
 *     tags:
 *       - Books
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Book ID
 *     responses:
 *       '200':
 *         description: Book found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Book'
 *       '404':
 *         description: Not Found
 *       '500':
 *         description: Internal Server Error
 *
 *   put:
 *     summary: Update a book by ID
 *     tags:
 *       - Books
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               authorId:
 *                 type: string
 *               publishedDate:
 *                 type: string
 *                 format: date
 *               pages:
 *                 type: integer
 *     responses:
 *       '200':
 *         description: Book updated
 *       '400':
 *         description: Bad Request
 *       '404':
 *         description: Not Found
 *       '500':
 *         description: Internal Server Error
 *
 *   delete:
 *     summary: Delete a book by ID
 *     tags:
 *       - Books
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '204':
 *         description: Book deleted
 *       '404':
 *         description: Not Found
 *       '500':
 *         description: Internal Server Error
 */

// Apply authentication middleware to all routes in this file
router.use(isAuthenticated);

// Simplified middleware
router.use(async (req, res, next) => {
  try {
    await db.checkConnection();
    next();
  } catch (error) {
    console.error('Database connection error:', error);
    return res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// GET all books
router.get('/', async (req, res) => {
  try {
    console.log('Fetching all books...');
    const books = await Book.findAll();
    
    console.log(`Found ${books.length} books`);
    
    res.json({ 
      success: true, 
      count: books.length,
      data: books 
    });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      details: 'Failed to fetch books'
    });
  }
});

// GET single book
router.get('/:id', async (req, res) => {
  try {
    console.log('Fetching book with ID:', req.params.id);
    const book = await Book.findById(req.params.id);
    
    if (!book) {
      return res.status(404).json({ 
        success: false, 
        message: 'Book not found' 
      });
    }
    
    res.json({ 
      success: true, 
      data: book 
    });
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// POST create book
router.post('/', async (req, res) => {
  try {
    console.log('Creating book with data:', req.body);
    
    if (!req.body.title) {
      return res.status(400).json({
        success: false,
        message: 'Book title is required'
      });
    }
    
    const result = await Book.create(req.body);
    const newBook = await Book.findById(result.insertedId);
    
    res.status(201).json({ 
      success: true, 
      data: newBook,
      message: 'Book created successfully'
    });
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// PUT update book
router.put('/:id', async (req, res) => {
  try {
    const result = await Book.update(req.params.id, req.body);
    
    if (!result.matchedCount) {
      return res.status(404).json({ 
        success: false, 
        message: 'Book not found' 
      });
    }
    
    const updatedBook = await Book.findById(req.params.id);
    res.json({ 
      success: true, 
      data: updatedBook,
      message: 'Book updated successfully' 
    });
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// DELETE book
router.delete('/:id', async (req, res) => {
  try {
    const result = await Book.delete(req.params.id);
    
    if (!result.deletedCount) {
      return res.status(404).json({ 
        success: false, 
        message: 'Book not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Book deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;