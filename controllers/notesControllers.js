const mongoose = require("mongoose");
const User = require("../models/User");
const Note = require("../models/Note");
const asyncHandler = require("express-async-handler");

//@desc Get all notes
//@route GET /notes
//@access Private
const getAllNotes = asyncHandler(async (req, res) => {
  const notes = await Note.find().lean().exec();
  if (!notes?.length) {
    return res.status(400).json({ message: "No Notes found" });
  }
  // Add username to each note before sending the response
  // See Promise.all with map() here: https://youtu.be/4lqJBBEpjRE
  // You could also do this with a for...of loop
  const notesWithUser = await Promise.all(
    notes.map(async (note) => {
      const user = await User.findById(note.user).lean().exec();
      return { ...note, username: user?.username };
    })
  );

  res.json(notesWithUser);
});

//@desc Create New Note
//@route POST /notes
//@access Private
const createNewNote = asyncHandler(async (req, res) => {
  const { user, title, text } = req.body;

  //Confirm Data
  if (!user || !title || !text) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check for duplicate title
  const duplicate = await Note.findOne({ title }).lean().exec();

  if (duplicate) {
    return res.status(409).json({ message: "Duplicate note title" });
  }

  //Create and store new note
  const note = await Note.create({ user, title, text });
  if (note) {
    res.status(201).json({ message: `New note created` });
  } else {
    res.status(400).json({ message: "Invalid Notes data received" });
  }
});

//@desc Update Note
//@route PATCH /notes
//@access Private
const updateNote = asyncHandler(async (req, res) => {
  const { id, user, title, text, completed } = req.body;

  //Confirm Data
  if (!id || (completed && typeof completed !== "boolean")) {
    return res
      .status(400)
      .json({ message: "Notes Id is required or Completed not correct" });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Notes Id is invalid" });
  }

  const note = await Note.findById(id).exec();
  if (!note) {
    return res.status(404).json({ message: "Note not found" });
  }

  // Check for duplicate title
  const duplicate = await Note.findOne({ title }).lean().exec();

  // Allow renaming of the original note
  if (duplicate && duplicate?._id.toString() !== id) {
    return res.status(409).json({ message: "Duplicate note title" });
  }

  if (user) note.user = user;
  if (title) note.title = title;
  if (text) note.text = text;
  if (completed) note.completed = completed;

  const updatedNote = await note.save();
  if (updatedNote) {
    res.status(201).json({ message: `${updatedNote.title} updated` });
  } else {
    res.status(400).json({ message: "Error while updating" });
  }
});

//@desc Delete Note
//@route DELETE /notes
//@access Private
const deleteNote = asyncHandler(async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "Note ID required" });
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Notes Id is invalid" });
  }

  const note = await Note.findById(id).exec();
  if (!note) {
    return res.status(400).json({ message: "Note not found" });
  }

  const result = await note.deleteOne();
  res.json(`Note ${result.title} with ID ${result._id} deleted`);
});

module.exports = { getAllNotes, createNewNote, updateNote, deleteNote };
