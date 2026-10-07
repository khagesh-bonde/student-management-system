const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const Student = require("./models/Student");
const User = require("./models/user");

const app = express();

/* ===============================
   MIDDLEWARE
================================ */

app.use(cors());
app.use(express.json());

/* ===============================
   MONGODB ATLAS CONNECTION
================================ */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected Successfully!");
  })
  .catch((error) => {
    console.log("MongoDB Connection Error:", error.message);
  });

/* ===============================
   TEST ROUTE
================================ */

app.get("/", (req, res) => {
  res.status(200).send("Student Management Backend is Running!");
});

/* =====================================================
   JWT AUTHENTICATION MIDDLEWARE
===================================================== */

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];

    // Expected:
    // Authorization: Bearer TOKEN
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Access denied. Please login first.",
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (error, user) => {
      if (error) {
        return res.status(403).json({
          message: "Invalid or expired token.",
        });
      }

      req.user = user;
      next();
    });
  } catch (error) {
    return res.status(500).json({
      message: "Authentication error",
    });
  }
};

/* =====================================================
   AUTHENTICATION
===================================================== */

/* ===============================
   SIGNUP
================================ */

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required.",
      });
    }

    // Clean values
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Name validation
    if (!/^[A-Za-z ]+$/.test(cleanName)) {
      return res.status(400).json({
        message: "Name should contain only letters and spaces.",
      });
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters.",
      });
    }

    // Check existing user
    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered. Please login.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
    });

    const savedUser = await user.save();

    return res.status(201).json({
      message: "User registered successfully!",
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
      },
    });
  } catch (error) {
    console.log("Signup Error:", error);

    // Duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email already registered.",
      });
    }

    return res.status(500).json({
      message: "Internal server error during signup.",
    });
  }
});

/* ===============================
   LOGIN
================================ */

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Required fields
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    // Find user
    const user = await User.findOne({
      email: cleanEmail,
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Check password
    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Check JWT secret
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing in .env");

      return res.status(500).json({
        message: "Server authentication configuration error.",
      });
    }

    // Create JWT
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    return res.status(200).json({
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.log("Login Error:", error);

    return res.status(500).json({
      message: "Internal server error during login.",
    });
  }
});

/* =====================================================
   STUDENT MANAGEMENT
===================================================== */

/* ===============================
   CREATE STUDENT
================================ */

app.post(
  "/api/students",
  authenticateToken,
  async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
        course,
        age,
      } = req.body;

      // Required fields
      if (!name || !email || !phone || !course || !age) {
        return res.status(400).json({
          message:
            "Name, email, phone, course and age are required.",
        });
      }

      const cleanName = name.trim();
      const cleanEmail = email.trim().toLowerCase();
      const cleanPhone = phone.trim();
      const cleanCourse = course.trim();
      const numericAge = Number(age);

      // Name validation
      if (!/^[A-Za-z ]+$/.test(cleanName)) {
        return res.status(400).json({
          message: "Student name should contain only letters.",
        });
      }

      // Email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({
          message: "Please enter a valid student email.",
        });
      }

      // Phone validation
      if (!/^[0-9]{10}$/.test(cleanPhone)) {
        return res.status(400).json({
          message: "Phone number must be exactly 10 digits.",
        });
      }

      // Age validation
      if (!Number.isInteger(numericAge)) {
        return res.status(400).json({
          message: "Age must be a valid number.",
        });
      }

      if (numericAge < 15 || numericAge > 100) {
        return res.status(400).json({
          message: "Age must be between 15 and 100.",
        });
      }

      // Duplicate email check
      const existingStudent = await Student.findOne({
        email: cleanEmail,
      });

      if (existingStudent) {
        return res.status(409).json({
          message: "A student with this email already exists.",
        });
      }

      // Create student
      const student = new Student({
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        course: cleanCourse,
        age: numericAge,
      });

      const savedStudent = await student.save();

      return res.status(201).json({
        message: "Student added successfully!",
        student: savedStudent,
      });
    } catch (error) {
      console.log("Create Student Error:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          message: "A student with this email already exists.",
        });
      }

      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: "Invalid student data.",
        });
      }

      return res.status(500).json({
        message: "Internal server error while adding student.",
      });
    }
  }
);

/* ===============================
   GET ALL STUDENTS
================================ */

app.get(
  "/api/students",
  authenticateToken,
  async (req, res) => {
    try {
      const students = await Student.find().sort({
        createdAt: -1,
      });

      return res.status(200).json(students);
    } catch (error) {
      console.log("Fetch Students Error:", error);

      return res.status(500).json({
        message: "Internal server error while fetching students.",
      });
    }
  }
);

/* ===============================
   GET SINGLE STUDENT
================================ */

app.get(
  "/api/students/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Validate MongoDB ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid student ID.",
        });
      }

      const student = await Student.findById(id);

      if (!student) {
        return res.status(404).json({
          message: "Student not found.",
        });
      }

      return res.status(200).json(student);
    } catch (error) {
      console.log("Get Student Error:", error);

      return res.status(500).json({
        message: "Internal server error while fetching student.",
      });
    }
  }
);

/* ===============================
   UPDATE STUDENT
================================ */

app.put(
  "/api/students/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Validate MongoDB ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid student ID.",
        });
      }

      const {
        name,
        email,
        phone,
        course,
        age,
      } = req.body;

      // Required fields
      if (!name || !email || !phone || !course || !age) {
        return res.status(400).json({
          message:
            "Name, email, phone, course and age are required.",
        });
      }

      const cleanName = name.trim();
      const cleanEmail = email.trim().toLowerCase();
      const cleanPhone = phone.trim();
      const cleanCourse = course.trim();
      const numericAge = Number(age);

      // Validation
      if (!/^[A-Za-z ]+$/.test(cleanName)) {
        return res.status(400).json({
          message: "Student name should contain only letters.",
        });
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({
          message: "Please enter a valid student email.",
        });
      }

      if (!/^[0-9]{10}$/.test(cleanPhone)) {
        return res.status(400).json({
          message: "Phone number must be exactly 10 digits.",
        });
      }

      if (!Number.isInteger(numericAge)) {
        return res.status(400).json({
          message: "Age must be a valid number.",
        });
      }

      if (numericAge < 15 || numericAge > 100) {
        return res.status(400).json({
          message: "Age must be between 15 and 100.",
        });
      }

      // Check duplicate email
      const existingStudent = await Student.findOne({
        email: cleanEmail,
        _id: { $ne: id },
      });

      if (existingStudent) {
        return res.status(409).json({
          message:
            "Another student with this email already exists.",
        });
      }

      const updatedStudent =
        await Student.findByIdAndUpdate(
          id,
          {
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            course: cleanCourse,
            age: numericAge,
          },
          {
            new: true,
            runValidators: true,
          }
        );

      if (!updatedStudent) {
        return res.status(404).json({
          message: "Student not found.",
        });
      }

      return res.status(200).json({
        message: "Student updated successfully!",
        student: updatedStudent,
      });
    } catch (error) {
      console.log("Update Student Error:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          message:
            "Another student with this email already exists.",
        });
      }

      if (error.name === "ValidationError") {
        return res.status(400).json({
          message: "Invalid student data.",
        });
      }

      return res.status(500).json({
        message: "Internal server error while updating student.",
      });
    }
  }
);

/* ===============================
   DELETE STUDENT
================================ */

app.delete(
  "/api/students/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Validate MongoDB ID
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: "Invalid student ID.",
        });
      }

      const deletedStudent =
        await Student.findByIdAndDelete(id);

      if (!deletedStudent) {
        return res.status(404).json({
          message: "Student not found.",
        });
      }

      return res.status(200).json({
        message: "Student deleted successfully!",
        student: deletedStudent,
      });
    } catch (error) {
      console.log("Delete Student Error:", error);

      return res.status(500).json({
        message: "Internal server error while deleting student.",
      });
    }
  }
);

/* =====================================================
   INVALID ROUTE HANDLER
===================================================== */

app.use((req, res) => {
  res.status(404).json({
    message: "API route not found.",
  });
});

/* =====================================================
   GLOBAL ERROR HANDLER
===================================================== */

app.use((error, req, res, next) => {
  console.log("Global Server Error:", error);

  res.status(500).json({
    message: "Something went wrong on the server.",
  });
});

/* ===============================
   START SERVER
================================ */

const PORT = 5000;

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});