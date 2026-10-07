import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import Login from "./Login";
import "./App.css";
import "./Login.css";

const API_URL = "http://localhost:5000/api/students";

function App() {
  /* =========================
     AUTHENTICATION
  ========================= */

  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("token")
  );

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
  };

  /* =========================
     STUDENT STATE
  ========================= */

  const [students, setStudents] = useState([]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    course: "",
    age: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  /* =========================
     SEARCH / FILTER / SORT
  ========================= */

  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] =
    useState("All Courses");
  const [sortOption, setSortOption] = useState("");

  /* =========================
     PAGINATION
  ========================= */

  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 5;

  /* =========================
     FETCH STUDENTS
  ========================= */

  const fetchStudents = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setIsLoggedIn(false);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setIsLoggedIn(false);
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          `❌ ${data.message || "Failed to fetch students"}`
        );
        return;
      }

      setStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("Fetch students error:", error);
      setMessage("❌ Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchStudents();
    }
  }, [isLoggedIn]);

  /* =========================
     FORM CHANGE
  ========================= */

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
  };

  /* =========================
     FORM VALIDATION
  ========================= */

  const validateForm = () => {
    const name = formData.name.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const course = formData.course.trim();
    const age = Number(formData.age);

    if (!name) {
      setMessage("❌ Student name is required");
      return false;
    }

    if (!/^[A-Za-z ]+$/.test(name)) {
      setMessage("❌ Name should contain only letters");
      return false;
    }

    if (!email) {
      setMessage("❌ Email is required");
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage("❌ Please enter a valid email address");
      return false;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      setMessage(
        "❌ Phone number must be exactly 10 digits"
      );
      return false;
    }

    if (!course) {
      setMessage("❌ Course is required");
      return false;
    }

    if (!formData.age) {
      setMessage("❌ Age is required");
      return false;
    }

    if (age < 15 || age > 100) {
      setMessage("❌ Age must be between 15 and 100");
      return false;
    }

    return true;
  };

  /* =========================
     ADD / UPDATE STUDENT
  ========================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setIsLoggedIn(false);
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const url = editingId
        ? `${API_URL}/${editingId}`
        : API_URL;

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          course: formData.course.trim(),
          age: Number(formData.age),
        }),
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setIsLoggedIn(false);
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          `❌ ${data.message || "Unable to save student"}`
        );
        return;
      }

      setMessage(
        editingId
          ? "✅ Student updated successfully!"
          : "✅ Student added successfully!"
      );

      setFormData({
        name: "",
        email: "",
        phone: "",
        course: "",
        age: "",
      });

      setEditingId(null);

      await fetchStudents();
    } catch (error) {
      console.log("Save student error:", error);
      setMessage("❌ Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     EDIT STUDENT
  ========================= */

  const editStudent = (student) => {
    setEditingId(student._id);

    setFormData({
      name: student.name || "",
      email: student.email || "",
      phone: student.phone || "",
      course: student.course || "",
      age: student.age || "",
    });

    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =========================
     CANCEL EDIT
  ========================= */

  const cancelEdit = () => {
    setEditingId(null);

    setFormData({
      name: "",
      email: "",
      phone: "",
      course: "",
      age: "",
    });

    setMessage("");
  };

  /* =========================
     DELETE STUDENT
  ========================= */

  const deleteStudent = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this student?"
    );

    if (!confirmDelete) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setIsLoggedIn(false);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setIsLoggedIn(false);
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          `❌ ${data.message || "Unable to delete student"}`
        );
        return;
      }

      setMessage("✅ Student deleted successfully!");

      await fetchStudents();
    } catch (error) {
      console.log("Delete student error:", error);
      setMessage("❌ Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     COURSES
  ========================= */

  const courses = useMemo(() => {
    const uniqueCourses = [
      ...new Set(
        students
          .map((student) => student.course?.trim())
          .filter(Boolean)
      ),
    ];

    return uniqueCourses.sort((a, b) =>
      a.localeCompare(b)
    );
  }, [students]);

  /* =========================
     FILTER + SEARCH + SORT
  ========================= */

  const filteredStudents = useMemo(() => {
    let result = [...students];

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();

      result = result.filter((student) => {
        return (
          student.name?.toLowerCase().includes(search) ||
          student.email?.toLowerCase().includes(search) ||
          student.phone?.includes(search) ||
          student.course?.toLowerCase().includes(search)
        );
      });
    }

    if (courseFilter !== "All Courses") {
      result = result.filter(
        (student) =>
          student.course?.toLowerCase() ===
          courseFilter.toLowerCase()
      );
    }

    if (sortOption === "name-asc") {
      result.sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      );
    }

    if (sortOption === "name-desc") {
      result.sort((a, b) =>
        (b.name || "").localeCompare(a.name || "")
      );
    }

    if (sortOption === "age-asc") {
      result.sort(
        (a, b) => Number(a.age) - Number(b.age)
      );
    }

    if (sortOption === "age-desc") {
      result.sort(
        (a, b) => Number(b.age) - Number(a.age)
      );
    }

    return result;
  }, [
    students,
    searchTerm,
    courseFilter,
    sortOption,
  ]);

  /* =========================
     PAGINATION
  ========================= */

  const totalPages = Math.ceil(
    filteredStudents.length / studentsPerPage
  );

  const startIndex =
    (currentPage - 1) * studentsPerPage;

  const paginatedStudents = filteredStudents.slice(
    startIndex,
    startIndex + studentsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, courseFilter, sortOption]);

  useEffect(() => {
    if (
      totalPages > 0 &&
      currentPage > totalPages
    ) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  /* =========================
     DASHBOARD ANALYTICS
  ========================= */

  const averageAge =
    students.length > 0
      ? (
          students.reduce(
            (total, student) =>
              total + Number(student.age || 0),
            0
          ) / students.length
        ).toFixed(1)
      : "0.0";

  const courseStats = courses.map((course) => {
    const count = students.filter(
      (student) =>
        student.course?.toLowerCase() ===
        course.toLowerCase()
    ).length;

    return {
      course,
      count,
    };
  });

  const maxCourseCount =
    courseStats.length > 0
      ? Math.max(
          ...courseStats.map(
            (item) => item.count
          )
        )
      : 1;

  const activeCourses = courseStats.filter(
    (item) => item.count > 0
  ).length;

  /* =========================
     CSV EXPORT
  ========================= */

  const exportCSV = () => {
    if (students.length === 0) {
      setMessage(
        "❌ No students available to export."
      );
      return;
    }

    const headers = [
      "Name",
      "Email",
      "Phone",
      "Course",
      "Age",
    ];

    const rows = students.map((student) => [
      student.name || "",
      student.email || "",
      student.phone || "",
      student.course || "",
      student.age || "",
    ]);

    const csvContent = [
      headers,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) => {
            const text = String(value).replace(
              /"/g,
              '""'
            );

            return `"${text}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = "students.csv";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    setMessage(
      "✅ Students exported successfully!"
    );
  };

  /* =========================
     PDF EXPORT
  ========================= */

  const exportPDF = () => {
    if (students.length === 0) {
      setMessage(
        "❌ No students available to export."
      );
      return;
    }

    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight =
      doc.internal.pageSize.getHeight();

    let y = 20;

    /* ===== TITLE ===== */

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");

    doc.text("StudentHub", 14, y);

    y += 8;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");

    doc.text(
      "Student Management System",
      14,
      y
    );

    y += 12;

    /* ===== SUMMARY ===== */

    doc.setFontSize(10);

    doc.text(
      `Total Students: ${students.length}`,
      14,
      y
    );

    doc.text(
      `Total Courses: ${courses.length}`,
      75,
      y
    );

    doc.text(
      `Average Age: ${averageAge}`,
      135,
      y
    );

    y += 12;

    /* ===== TABLE HEADER ===== */

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");

    doc.text("Name", 14, y);
    doc.text("Email", 55, y);
    doc.text("Phone", 105, y);
    doc.text("Course", 135, y);
    doc.text("Age", 180, y);

    y += 5;

    doc.line(14, y, 196, y);

    y += 7;

    /* ===== TABLE DATA ===== */

    doc.setFont("helvetica", "normal");

    students.forEach((student) => {
      if (y > pageHeight - 20) {
        doc.addPage();

        y = 20;

        doc.setFont("helvetica", "bold");

        doc.text("StudentHub - Student Records", 14, y);

        y += 10;

        doc.setFontSize(9);

        doc.text("Name", 14, y);
        doc.text("Email", 55, y);
        doc.text("Phone", 105, y);
        doc.text("Course", 135, y);
        doc.text("Age", 180, y);

        y += 5;

        doc.line(14, y, 196, y);

        y += 7;

        doc.setFont("helvetica", "normal");
      }

      const name = String(student.name || "");

      const email = String(student.email || "");

      const phone = String(student.phone || "");

      const course = String(student.course || "");

      const age = String(student.age || "");

      const emailText = doc.splitTextToSize(
        email,
        45
      );

      const nameText = doc.splitTextToSize(
        name,
        38
      );

      const courseText = doc.splitTextToSize(
        course,
        40
      );

      doc.text(nameText, 14, y);

      doc.text(emailText, 55, y);

      doc.text(phone, 105, y);

      doc.text(courseText, 135, y);

      doc.text(age, 180, y);

      const lineCount = Math.max(
        nameText.length,
        emailText.length,
        courseText.length
      );

      y += Math.max(
        8,
        lineCount * 5
      );
    });

    /* ===== FOOTER ===== */

    const totalPagesPDF =
      doc.internal.getNumberOfPages();

    for (
      let page = 1;
      page <= totalPagesPDF;
      page++
    ) {
      doc.setPage(page);

      doc.setFontSize(8);

      doc.setFont("helvetica", "normal");

      doc.text(
        `Page ${page} of ${totalPagesPDF}`,
        pageWidth - 35,
        pageHeight - 10
      );

      doc.text(
        "Generated by StudentHub",
        14,
        pageHeight - 10
      );
    }

    doc.save("student-records.pdf");

    setMessage(
      "✅ PDF exported successfully!"
    );
  };

  /* =========================
     CLEAR SEARCH
  ========================= */

  const clearSearch = () => {
    setSearchTerm("");
  };

  /* =========================
     LOGIN PAGE
  ========================= */

  if (!isLoggedIn) {
    return (
      <Login
        onLogin={() => {
          setIsLoggedIn(true);
        }}
      />
    );
  }

  /* =========================
     DASHBOARD
  ========================= */

  return (
    <div className="app">
      {/* =========================
          NAVBAR
      ========================= */}

      <nav className="navbar">
        <div className="brand">
          <div className="brand-icon">🎓</div>

          <div>
            <h2>StudentHub</h2>
            <span>Management System</span>
          </div>
        </div>

        <div className="nav-status">
          <span className="status-dot"></span>
          System Online

          <button
            className="logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="container">
        {/* =========================
            HERO
        ========================= */}

        <section className="hero">
          <div>
            <div className="hero-tag">
              📚 STUDENT PORTAL
            </div>

            <h1>
              Manage Your Students
              <br />
              <span>Smartly & Easily.</span>
            </h1>

            <p>
              Add, update, search and manage all your
              student records from one beautiful dashboard.
            </p>
          </div>

          <div className="hero-icon">🎓</div>
        </section>

        {/* =========================
            STATS
        ========================= */}

        <section className="stats">
          <div className="stat-card">
            <div className="stat-icon blue">
              👨‍🎓
            </div>

            <div>
              <p>Total Students</p>
              <h2>{students.length}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">
              📚
            </div>

            <div>
              <p>Total Courses</p>
              <h2>{courses.length}</h2>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">
              🎂
            </div>

            <div>
              <p>Average Age</p>
              <h2>{averageAge}</h2>
            </div>
          </div>
        </section>

        {/* =========================
            FORM
        ========================= */}

        <section className="form-card">
          <div className="section-title">
            <div className="title-icon">
              {editingId ? "✏️" : "➕"}
            </div>

            <div>
              <h2>
                {editingId
                  ? "Edit Student"
                  : "Add New Student"}
              </h2>

              <p>
                {editingId
                  ? "Update student details below"
                  : "Enter student details below"}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Student Name</label>

                <div className="input-wrapper">
                  <span>👤</span>

                  <input
                    type="text"
                    name="name"
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={(e) => {
                      const value =
                        e.target.value;

                      if (
                        /^[A-Za-z ]*$/.test(value)
                      ) {
                        setFormData({
                          ...formData,
                          name: value,
                        });

                        setMessage("");
                      }
                    }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address</label>

                <div className="input-wrapper">
                  <span>✉️</span>

                  <input
                    type="email"
                    name="email"
                    placeholder="student@email.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Phone Number</label>

                <div className="input-wrapper">
                  <span>📱</span>

                  <input
                    type="text"
                    name="phone"
                    placeholder="Enter 10 digit phone number"
                    value={formData.phone}
                    maxLength="10"
                    onChange={(e) => {
                      const value =
                        e.target.value.replace(
                          /\D/g,
                          ""
                        );

                      setFormData({
                        ...formData,
                        phone: value,
                      });

                      setMessage("");
                    }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Course</label>

                <div className="input-wrapper">
                  <span>📚</span>

                  <input
                    type="text"
                    name="course"
                    placeholder="e.g. MCA, BCA, MBA"
                    value={formData.course}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Age</label>

                <div className="input-wrapper">
                  <span>🎂</span>

                  <input
                    type="number"
                    name="age"
                    placeholder="Enter age"
                    value={formData.age}
                    min="15"
                    max="100"
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="primary-btn"
                disabled={loading}
              >
                {loading
                  ? "Saving..."
                  : editingId
                  ? "✏️ Update Student"
                  : "➕ Add Student"}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {message && (
            <div className="message">
              {message}
            </div>
          )}
        </section>

        {/* =========================
            STUDENT DIRECTORY
        ========================= */}

        <section className="table-card">
          <div className="table-top">
            <div>
              <h2>Student Directory</h2>

              <p>
                Search, filter and manage registered
                students
              </p>
            </div>

            <div className="table-actions">
              <select
                className="filter-select"
                value={courseFilter}
                onChange={(e) =>
                  setCourseFilter(e.target.value)
                }
              >
                <option>All Courses</option>

                {courses.map((course) => (
                  <option
                    key={course}
                    value={course}
                  >
                    {course}
                  </option>
                ))}
              </select>

              <select
                className="filter-select"
                value={sortOption}
                onChange={(e) =>
                  setSortOption(e.target.value)
                }
              >
                <option value="">
                  Sort By
                </option>

                <option value="name-asc">
                  Name A-Z
                </option>

                <option value="name-desc">
                  Name Z-A
                </option>

                <option value="age-asc">
                  Age Low-High
                </option>

                <option value="age-desc">
                  Age High-Low
                </option>
              </select>

              <div className="search-box">
                <span className="search-icon">
                  🔍
                </span>

                <input
                  type="text"
                  placeholder="Search student..."
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(e.target.value)
                  }
                />

                {searchTerm && (
                  <button
                    className="clear-search"
                    onClick={clearSearch}
                    type="button"
                  >
                    ×
                  </button>
                )}
              </div>

              <button
                className="export-btn"
                onClick={exportCSV}
                type="button"
              >
                📥 Export CSV
              </button>

              <button
                className="pdf-btn"
                onClick={exportPDF}
                type="button"
              >
                📄 Export PDF
              </button>

              <div className="total-badge">
                {filteredStudents.length}{" "}
                {filteredStudents.length === 1
                  ? "Student"
                  : "Students"}
              </div>
            </div>
          </div>

          <div className="table-wrapper">
            {loading && students.length === 0 ? (
              <div className="empty">
                <div>⏳</div>

                <h3>
                  Loading students...
                </h3>

                <p>Please wait.</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="empty">
                <div>📭</div>

                <h3>
                  No students found
                </h3>

                <p>
                  Try changing your search or filter.
                </p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>STUDENT</th>
                    <th>EMAIL</th>
                    <th>PHONE</th>
                    <th>COURSE</th>
                    <th>AGE</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedStudents.map(
                    (student) => (
                      <tr key={student._id}>
                        <td>
                          <div className="student-name">
                            <div className="avatar">
                              {student.name
                                ?.charAt(0)
                                .toUpperCase()}
                            </div>

                            <span>
                              {student.name}
                            </span>
                          </div>
                        </td>

                        <td className="email">
                          {student.email}
                        </td>

                        <td>
                          {student.phone}
                        </td>

                        <td>
                          <span className="course">
                            {student.course}
                          </span>
                        </td>

                        <td>
                          {student.age}
                        </td>

                        <td>
                          <button
                            className="edit-btn"
                            onClick={() =>
                              editStudent(
                                student
                              )
                            }
                          >
                            ✏️ Edit
                          </button>

                          <button
                            className="delete-btn"
                            onClick={() =>
                              deleteStudent(
                                student._id
                              )
                            }
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* =========================
              PAGINATION
          ========================= */}

          {filteredStudents.length >
            studentsPerPage && (
            <div className="pagination">
              <div className="pagination-info">
                Showing{" "}
                <strong>
                  {startIndex + 1}
                </strong>{" "}
                -
                <strong>
                  {Math.min(
                    startIndex +
                      studentsPerPage,
                    filteredStudents.length
                  )}
                </strong>{" "}
                of{" "}
                <strong>
                  {filteredStudents.length}
                </strong>{" "}
                students
              </div>

              <div className="pagination-controls">
                <button
                  className="page-btn"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage(
                      (previous) =>
                        Math.max(
                          previous - 1,
                          1
                        )
                    )
                  }
                >
                  ← Previous
                </button>

                <div className="page-numbers">
                  {Array.from(
                    {
                      length: totalPages,
                    },
                    (_, index) => index + 1
                  ).map((page) => (
                    <button
                      key={page}
                      className={`page-number ${
                        currentPage === page
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setCurrentPage(page)
                      }
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  className="page-btn"
                  disabled={
                    currentPage === totalPages
                  }
                  onClick={() =>
                    setCurrentPage(
                      (previous) =>
                        Math.min(
                          previous + 1,
                          totalPages
                        )
                    )
                  }
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </section>

        {/* =========================
            ANALYTICS
        ========================= */}

        <section className="analytics-section">
          <div className="analytics-header">
            <div>
              <h2>
                📊 Dashboard Analytics
              </h2>

              <p>
                Overview of your student records
              </p>
            </div>

            <div className="analytics-badge">
              {students.length} Total Students
            </div>
          </div>

          <div className="analytics-grid">
            <div className="analytics-card">
              <div className="analytics-card-header">
                <h3>
                  📚 Students by Course
                </h3>

                <p>
                  Course-wise student distribution
                </p>
              </div>

              {courseStats.length > 0 ? (
                <div className="course-chart">
                  {courseStats.map(
                    (item) => (
                      <div
                        className="chart-row"
                        key={item.course}
                      >
                        <div className="chart-label">
                          <span>
                            {item.course}
                          </span>

                          <strong>
                            {item.count}
                          </strong>
                        </div>

                        <div className="chart-bar-bg">
                          <div
                            className="chart-bar"
                            style={{
                              width: `${Math.max(
                                (item.count /
                                  maxCourseCount) *
                                  100,
                                8
                              )}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="analytics-empty">
                  <div>📊</div>

                  <p>
                    No student data available
                  </p>
                </div>
              )}
            </div>

            <div className="analytics-card">
              <div className="analytics-card-header">
                <h3>
                  📈 Quick Summary
                </h3>

                <p>
                  Current dashboard statistics
                </p>
              </div>

              <div className="summary-list">
                <div className="summary-item">
                  <span>👨‍🎓</span>

                  <div>
                    <p>
                      Total Students
                    </p>

                    <strong>
                      {students.length}
                    </strong>
                  </div>
                </div>

                <div className="summary-item">
                  <span>📚</span>

                  <div>
                    <p>
                      Active Courses
                    </p>

                    <strong>
                      {activeCourses}
                    </strong>
                  </div>
                </div>

                <div className="summary-item">
                  <span>🎂</span>

                  <div>
                    <p>
                      Average Student Age
                    </p>

                    <strong>
                      {averageAge} Years
                    </strong>
                  </div>
                </div>

                <div className="summary-item">
                  <span>⚡</span>

                  <div>
                    <p>
                      System Status
                    </p>

                    <strong className="active-text">
                      Active
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        © 2026 StudentHub • Student Management System
      </footer>
    </div>
  );
}

export default App;