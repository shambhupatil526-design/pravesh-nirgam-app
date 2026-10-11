
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzBW8Zd86aCJnmA6svLBrpQ0A97p0N4c5qb9dPr6Al5_CtfY4zsIyEETW7C2n9j435D/exec";

const fields = [
  ["admissionNo", "प्रवेश अनुक्रमांक", "text", true],
  ["studentName", "विद्यार्थ्याचे संपूर्ण नाव आडनावासह", "text", true],
  ["parentName", "वडिलांचे नाव / पालकाचे नाव", "text"],
  ["religionCaste", "धर्म व जात / पोटजात", "text"],
  ["parentOccupation", "वडील / पालकांचा व्यवसाय", "text"],
  ["motherTongue", "मातृभाषा", "text"],
  ["aadhaar", "विद्यार्थी आधार कार्ड क्रमांक", "text"],
  ["studentId", "विद्यार्थी ओळख क्रमांक", "text"],
  ["dobNumeric", "जन्म दिनांक अंकात", "date"],
  ["dobWords", "जन्म दिनांक अक्षरात", "text"],
  ["birthPlace", "जन्मस्थळ, तालुका, जिल्हा, राज्य व देश", "text"],
  ["admissionDate", "प्रवेश दिनांक", "date"],
  ["admissionClass", "प्रवेश समयी वर्ग", "text"],
  ["previousSchool", "पूर्वीच्या शाळेचे नाव", "text"],
  ["currentClass", "इयत्ता", "text"],
  ["admissionOfficer", "प्रवेश देणाऱ्या अधिकाऱ्याची सही / नोंद", "text"],
  ["leavingClass", "निर्गम समयी वर्ग", "text"],
  ["leavingDate", "निर्गम दिनांक", "date"],
  ["leavingReason", "शाळा सोडल्याचे कारण", "textarea"],
  ["identificationMarks", "परिचय चिन्ह — दोन", "textarea"],
  ["leavingOfficer", "निर्गम नोंद घेणाऱ्या अधिकाऱ्याची सही / नोंद", "text"],
  ["headmasterSignature", "मुख्याध्यापकांची स्वाक्षरी / नोंद", "text"],
  ["details", "विवरण", "textarea"]
];

const $ = id => document.getElementById(id);

const form = $("studentForm");
const submitButton = $("submitButton");
const message = $("message");
const searchInput = $("studentSearch");
const refreshButton = $("refreshStudents");
const studentList = $("studentList");
const studentDetails = $("studentDetails");
const detailsContent = $("detailsContent");
const listMessage = $("listMessage");

let students = [];
let templateData = "";
let submitting = false;

// ======================================
// 1. फॉर्ममध्ये 23 फील्ड तयार करणे
// ======================================

const formFields = $("formFields");

if (formFields && formFields.children.length === 0) {
  fields.forEach(([id, label, type, required]) => {
    const wrapper = document.createElement("div");
    wrapper.className = "field";

    const title = document.createElement("label");
    title.htmlFor = id;
    title.textContent = label + (required ? " *" : "");

    const input = document.createElement(
      type === "textarea" ? "textarea" : "input"
    );

    input.id = id;
    input.name = id;

    if (type !== "textarea") input.type = type;
    if (required) input.required = true;

    if (["admissionNo", "aadhaar", "studentId"].includes(id)) {
      input.type = "text";
      input.inputMode = "numeric";
    }

    wrapper.append(title, input);
    formFields.appendChild(wrapper);
  });
}

// ======================================
// 2. Google Sheet API
// ======================================

async function apiGet(params = {}) {
  const query = new URLSearchParams({
    ...params,
    t: String(Date.now())
  });

  const response = await fetch(
    `${SCRIPT_URL}?${query.toString()}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error("सर्व्हर प्रतिसाद मिळाला नाही.");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.message || "माहिती मिळाली नाही.");
  }

  return result;
}

// ======================================
// 3. विद्यार्थी यादी लोड करणे
// ======================================

async function loadStudents() {
  if (listMessage) {
    listMessage.textContent = "विद्यार्थी यादी लोड होत आहे...";
  }

  if (studentList) studentList.replaceChildren();

  try {
    const result = await apiGet({ action: "list" });

    students = result.students || [];
    showStudents();

    if (listMessage) {
      listMessage.textContent = "एकूण नोंदी: " + students.length;
    }
  } catch (error) {
    console.error("List error:", error);

    if (listMessage) {
      listMessage.textContent =
        "यादी मिळाली नाही. इंटरनेट आणि Apps Script तपासा.";
    }
  }
}

// ======================================
// 4. विद्यार्थी शोधणे
// ======================================

function showStudents() {
  if (!studentList || !searchInput) return;

  const query = searchInput.value.trim().toLowerCase();

  const filtered = students.filter(student =>
    String(student.studentName || "").toLowerCase().includes(query) ||
    String(student.admissionNo || "").toLowerCase().includes(query)
  );

  if (!filtered.length) {
    studentList.textContent = "विद्यार्थी सापडला नाही.";
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "table-wrap";

  const table = document.createElement("table");

  table.innerHTML = `
    <thead>
      <tr>
        <th>प्रवेश क्रमांक</th>
        <th>विद्यार्थ्याचे नाव</th>
        <th>इयत्ता</th>
        <th>कृती</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  filtered.forEach(student => {
    const tr = document.createElement("tr");

    [
      student.admissionNo,
      student.studentName,
      student.currentClass || "—"
    ].forEach(value => {
      const td = document.createElement("td");
      td.textContent = value || "—";
      tr.appendChild(td);
    });

    const actionCell = document.createElement("td");
    const button = document.createElement("button");

    button.type = "button";
    button.className = "student-action";
    button.textContent = "प्रवेश-निर्गम प्रिंट";
    button.addEventListener("click", () => openStudent(student));

    actionCell.appendChild(button);
    tr.appendChild(actionCell);
    tbody.appendChild(tr);
  });

  wrap.appendChild(table);
  studentList.replaceChildren(wrap);
}

// ======================================
// 5. विद्यार्थ्याचा तपशील
// ======================================

async function openStudent(student) {
  studentDetails.hidden = false;
  detailsContent.textContent = "माहिती मिळवत आहोत...";

  let data = { ...student };

  try {
    const result = await apiGet({
      action: "detail",
      admissionNo: student.admissionNo
    });

    data = { ...student, ...(result.student || {}) };
  } catch (error) {
    console.warn("तपशील मिळवताना अडचण:", error);
  }

  showStudentDetails(data);
  studentDetails.scrollIntoView({ behavior: "smooth" });
}

function showStudentDetails(data) {
  detailsContent.replaceChildren();

  fields.forEach(([id, label]) => {
    const row = document.createElement("div");
    row.className = "detail-row";

    const title = document.createElement("strong");
    title.textContent = label;

    const value = document.createElement("div");
    value.textContent = data[id] || "—";

    row.append(title, value);
    detailsContent.appendChild(row);
  });

  const printButton = document.createElement("button");
  printButton.type = "button";
  printButton.textContent = "मूळ पत्रक प्रिंट करा";
  printButton.addEventListener("click", () => printStudent(data));

  detailsContent.appendChild(printButton);
}

// ======================================
// 6. मूळ रजिस्टरचा फोटो निवडणे
// ======================================

const templatePhoto = $("templatePhoto");

if (templatePhoto) {
  templatePhoto.addEventListener("change", event => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      templateData = reader.result;
      $("templateImage").src = templateData;

      $("photoMessage").textContent =
        "मूळ पत्रकाचा फोटो निवडला आहे.";
    };

    reader.onerror = () => {
      $("photoMessage").textContent = "फोटो वाचता आला नाही.";
    };

    reader.readAsDataURL(file);
  });
}

// ======================================
// 7. सुधारित प्रिंट फंक्शन
// ======================================

async function printStudent(data) {
  if (!templateData) {
    alert("प्रथम मूळ प्रवेश-निर्गम पत्रकाचा फोटो निवडा.");
    return;
  }

  const area = $("printArea");
  const image = $("templateImage");
  const output = $("printFields");

  output.replaceChildren();
  image.src = templateData;

  /*
    खालील स्थानं A4 फोटोच्या प्रमाणानुसार आहेत.
    प्रत्येक नोंद डाव्या मोठ्या रकान्याच्या मध्यभागी येते.
    Y स्थाने प्रत्येक रकान्याच्या मध्यासाठी स्वतंत्र आहेत.
  */

  const rowCenters = [
    5.9,   // 1 प्रवेश अनुक्रमांक
    9.7,   // 2 विद्यार्थ्याचे नाव
    14.9,  // 3 वडील / पालकाचे नाव
    19.4,  // 4 धर्म व जात
    22.7,  // 5 व्यवसाय
    25.7,  // 6 मातृभाषा
    28.8,  // 7 आधार कार्ड
    31.9,  // 8 विद्यार्थी ओळख क्रमांक
    35.6,  // 9 जन्मतारीख अंकात
    39.4,  // 10 जन्मतारीख अक्षरात
    43.2,  // 11 जन्मस्थळ
    46.9,  // 12 प्रवेश दिनांक
    50.3,  // 13 प्रवेश समयी वर्ग
    53.5,  // 14 पूर्वीच्या शाळेचे नाव
    56.8,  // 15 इयत्ता
    61.3,  // 16 प्रवेश अधिकाऱ्याची नोंद
    65.4,  // 17 निर्गम समयी वर्ग
    68.8,  // 18 निर्गम दिनांक
    72.2,  // 19 शाळा सोडण्याचे कारण
    77.4,  // 20 परिचय चिन्ह
    83.8,  // 21 निर्गम अधिकाऱ्याची नोंद
    89.1,  // 22 मुख्याध्यापकांची नोंद
    92.8   // 23 विवरण
  ];

  fields.forEach(([id], index) => {
    const div = document.createElement("div");
    div.className = "print-field";

    div.style.position = "absolute";

    // मोठ्या डाव्या रकान्याचा मध्य
    div.style.left = "35.8%";
    div.style.top = rowCenters[index] + "%";
    div.style.width = "40%";

    // दिलेल्या बिंदूच्या मध्यावर मजकूर ठेवणे
    div.style.transform = "translate(-50%, -50%)";

    // मजकूर आडवा व उभा मध्यभागी
    div.style.display = "flex";
    div.style.alignItems = "center";
    div.style.justifyContent = "center";
    div.style.textAlign = "center";

    div.style.fontFamily = "Arial, sans-serif";
    div.style.fontSize = "8pt";
    div.style.fontWeight = "normal";
    div.style.lineHeight = "1.15";
    div.style.whiteSpace = "pre-wrap";
    div.style.overflowWrap = "anywhere";
    div.style.padding = "1px 3px";
    div.style.color = "#111";

    div.textContent = data[id] || "";
    output.appendChild(div);
  });

  area.hidden = false;

  try {
    if (image.decode) {
      await image.decode();
    } else if (!image.complete || !image.naturalWidth) {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });
    }

    window.print();
  } catch (error) {
    console.error("Print error:", error);
    area.hidden = true;
    alert("मूळ पत्रकाचा फोटो लोड झाला नाही.");
  }
}

// ======================================
// 8. Google Sheet मध्ये सेव्ह पडताळणे
// ======================================

async function verifySaved(admissionNo) {
  for (let attempt = 0; attempt < 8; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const result = await apiGet({ action: "list" });
      const list = result.students || [];

      const found = list.some(student =>
        String(student.admissionNo || "").trim() ===
        String(admissionNo).trim()
      );

      if (found) {
        students = list;
        showStudents();

        if (listMessage) {
          listMessage.textContent = "एकूण नोंदी: " + students.length;
        }

        return true;
      }
    } catch (error) {
      console.warn("Verification error:", error);
    }
  }

  return false;
}

// ======================================
// 9. नवीन विद्यार्थी सेव्ह करणे
// ======================================

if (form) {
  form.addEventListener("submit", async event => {
    event.preventDefault();

    if (submitting || !form.reportValidity()) return;

    const admissionNo = $("admissionNo").value.trim();

    if (!admissionNo) {
      message.textContent = "प्रवेश अनुक्रमांक भरा.";
      return;
    }

    const duplicate = students.some(student =>
      String(student.admissionNo || "").trim() === admissionNo
    );

    if (duplicate) {
      message.textContent =
        "हा प्रवेश अनुक्रमांक आधीपासून आहे. कृपया तपासा.";
      return;
    }

    submitting = true;
    submitButton.disabled = true;
    message.textContent = "नोंद सेव्ह होत आहे...";

    try {
      const body = new URLSearchParams();

      for (const [key, value] of new FormData(form).entries()) {
        body.append(key, String(value));
      }

      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body
      });

      message.textContent =
        "माहिती पाठवली आहे. सेव्ह झाल्याची खात्री करत आहोत...";

      const saved = await verifySaved(admissionNo);

      if (saved) {
        message.textContent =
          "नोंद Google Sheet मध्ये यशस्वीपणे सेव्ह झाली.";
        form.reset();
      } else {
        message.textContent =
          "नोंद सापडली नाही किंवा खात्री करता आली नाही. " +
          "Google Sheet तपासा. पुन्हा Submit करण्यापूर्वी " +
          "प्रवेश क्रमांक शोधा.";
      }
    } catch (error) {
      console.error("Save error:", error);

      message.textContent =
        "नोंद पाठवताना अडचण आली. इंटरनेट व Apps Script तपासा.";
    } finally {
      submitting = false;
      submitButton.disabled = false;
    }
  });
}

// ======================================
// 10. बटणे आणि सुरुवातीची यादी
// ======================================

if (searchInput) {
  searchInput.addEventListener("input", showStudents);
}

if (refreshButton) {
  refreshButton.addEventListener("click", loadStudents);
}

const closeDetails = $("closeDetails");

if (closeDetails) {
  closeDetails.addEventListener("click", () => {
    studentDetails.hidden = true;
  });
}

loadStudents();
