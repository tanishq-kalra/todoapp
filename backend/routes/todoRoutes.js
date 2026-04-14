const express = require("express");
const router = express.Router();
const Todo = require("../models/Todo");

// GET all todos
router.get("/", async (req, res) => {
  const todos = await Todo.find();
  res.json(todos);
});

// ADD todo
router.post("/", async (req, res) => {
  console.log("POST BODY:", req.body);

  if (!req.body.title) {
    return res.status(400).json({ error: "Title missing" });
  }

  const newTodo = new Todo({ title: req.body.title });
  const savedTodo = await newTodo.save();

  res.json(savedTodo);
});

// TOGGLE completed / pending
// UPDATE todo status
router.put("/:id", async (req, res) => {
  const { completed } = req.body;

  const todo = await Todo.findByIdAndUpdate(
    req.params.id,
    { completed },
    { new: true }
  );

  res.json(todo);
});


// DELETE todo
router.delete("/:id", async (req, res) => {
  await Todo.findByIdAndDelete(req.params.id);
  res.json({ message: "Todo deleted" });
});

module.exports = router;
