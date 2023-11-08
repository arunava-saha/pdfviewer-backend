const express = require("express");
const app = express();
const mongoose = require("mongoose");
app.use(express.json());
const fs = require("fs");
const { PDFDocument } = require("pdf-lib");
const cors = require("cors");
app.use(cors());
app.use("/files", express.static("files"));
//mongodb connection----------------------------------------------
const mongoUrl =
  "mongodb+srv://aru:1234@cluster0.okhy35m.mongodb.net/FileViewer?retryWrites=true&w=majority";

mongoose
  .connect(mongoUrl)
  .then(() => {
    console.log("Connected to database");
  })
  .catch((e) => console.log(e));
//multer------------------------------------------------------------
const multer = require("multer");
const port = process.env.PORT || 5001;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./files");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now();
    cb(null, uniqueSuffix + file.originalname);
  },
});

const PdfSchema = require("./models/pdfSchema");
const upload = multer({ storage: storage });

//apis----------------------------------------------------------------
app.post("/upload-files", upload.single("file"), async (req, res) => {
  console.log(req.file);
  const title = req.body.title;
  const fileName = req.file.filename;
  try {
    await PdfSchema.create({ title: title, pdf: fileName });
    res.send({ status: "ok" });
  } catch (error) {
    res.json({ status: error });
  }
});
app.post("/generate-pdf", async (req, res) => {
  try {
    const data = JSON.parse(req.body.body);
    const pages = data.selectedPages;
    console.log(data.selectedPages);
    const pdfDoc = await PDFDocument.create();
    const originalPdfBytes = await fs.promises.readFile(
      `./files/${data.originalPdf}`
    ); // Load the original PDF
    console.log(originalPdfBytes);
    const originalPdfDoc = await PDFDocument.load(originalPdfBytes);
    // console.log(originalPdfDoc);
    // // Modify the PDF and create a new PDF based on selected pages
    // // Example: Clone selected pages to the new PDF

    let i = 0;
    // pages.map(async (pageNumber) => {
    //   const [copiedPage] = await pdfDoc.copyPages(originalPdfDoc, [
    //     pageNumber - 1,
    //   ]);
    //   pdfDoc.addPage(copiedPage);
    //   console.log(pageNumber, i);
    //   i++;
    // });
    for (let i = 0; i < pages.length; i++) {
      let [copiedPage] = await pdfDoc.copyPages(originalPdfDoc, [pages[i] - 1]);
      pdfDoc.addPage(copiedPage);
    }
    const newPdfBytes = await pdfDoc.save();

    const newPdf = Buffer.from(newPdfBytes.buffer);
    const fpath = `./files/${Date.now()}_output.pdf`;
    fs.writeFileSync(fpath, newPdfBytes);
    // const newPdf = await PDFDocument.load(newPdfBytes);
    // console.log(newPdf);
    // await PdfSchema.create({ title: title, pdf: fileName });
    // Send the newly generated PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="custom_filename.pdf"'
    ); // Replace with your desired file name
    res.send({ filePath: fpath });
    // res.status(200).send({ status: "ok", message: "done", data: newPdfBytes });
  } catch (error) {
    console.log(error);
  }
});

app.get("/get-files", async (req, res) => {
  try {
    PdfSchema.find({}).then((data) => {
      res.send({ status: "ok", data: data });
    });
  } catch (error) {
    console.log(error);
  }
});

app.get("/", async (req, res) => {
  res.send("Success!!!!!!");
});

app.listen(port, () => {
  console.log(`server at http://localhost:${port}`);
});
