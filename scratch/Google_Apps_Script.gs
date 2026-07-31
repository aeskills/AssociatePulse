/**
 * ASSOCIATEPULSE ERP - GOOGLE APPS SCRIPT WEB APP
 * Version: 6.6 (Live Fetch & Multi-Tab Sync Engine)
 * 
 * DRIVE ROOT FOLDER ID: 1VtOVTezCoVOFd9AqoYTqcRdSx5k0oHQU
 */

var DRIVE_ROOT_FOLDER_ID = "1VtOVTezCoVOFd9AqoYTqcRdSx5k0oHQU";

function testManualRun() {
  Logger.log("AssociatePulse ERP Webhook Engine Ready & Active.");
}

function doPost(e) {
  var rawText = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
  return processRequest(rawText);
}

function doGet(e) {
  if (e && e.parameter) {
    if (e.parameter.action === 'get_trainer_data') {
      return handleGetTrainerData(e.parameter.trainerName, e.parameter.state, e.parameter.dateStr);
    }
    if (e.parameter.action === 'get_school_report_data') {
      return handleGetSchoolReportData(e.parameter.schoolName, e.parameter.udiseCode);
    }
  }
  var payloadStr = (e && e.parameter && e.parameter.payload) ? e.parameter.payload : (e && e.parameters && e.parameters.payload ? e.parameters.payload[0] : null);
  if (payloadStr) {
    return processRequest(payloadStr);
  }
  return ContentService.createTextOutput("AssociatePulse ERP Webhook Service Active & Syncing.").setMimeType(ContentService.MimeType.TEXT);
}

function handleGetTrainerData(trainerName, stateName, requestedDate) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var stateAbbrev = getAbbreviation(stateName);
    var tabName = (trainerName || 'Trainer').trim() + " (" + stateAbbrev.toUpperCase() + ")";
    var sheet = ss.getSheetByName(tabName);

    if (!sheet) {
      return respondJSON({ status: 'not_found', message: 'No sheet tab found for trainer' });
    }

    var dateStr = requestedDate || getFormattedDate();
    var lastCol = sheet.getLastColumn();
    if (lastCol < 2) {
      return respondJSON({ status: 'no_data', message: 'No date columns present' });
    }

    var row8Values = sheet.getRange(8, 1, 1, lastCol).getValues()[0];
    var matchedCols = [];
    for (var c = 1; c < row8Values.length; c++) {
      var headerVal = String(row8Values[c] || "").trim();
      if (headerVal && headerVal.indexOf(dateStr) !== -1) {
        matchedCols.push(c + 1);
      }
    }

    if (matchedCols.length === 0) {
      return respondJSON({ status: 'no_data', message: 'No record for requested date' });
    }

    var allVisits = [];
    for (var v = 0; v < matchedCols.length; v++) {
      var targetCol = matchedCols[v];
      var colValues = sheet.getRange(9, targetCol, 20, 1).getDisplayValues();
      var visitRecord = {
        visitNum: v + 1,
        columnIdx: targetCol,
        headerLabel: String(row8Values[targetCol - 1] || ''),
        status: colValues[0][0] ? String(colValues[0][0]) : '',
        leaveReason: colValues[1][0] ? String(colValues[1][0]) : '',
        checkIn: cleanTimeStr(colValues[2][0]),
        checkOut: cleanTimeStr(colValues[3][0]),
        workingHours: colValues[4][0] ? String(colValues[4][0]) : '',
        clockInLocation: colValues[5][0] ? String(colValues[5][0]) : '',
        clockOutLocation: colValues[6][0] ? String(colValues[6][0]) : '',
        driveLink: colValues[7][0] ? String(colValues[7][0]) : '',
        schoolName: colValues[8][0] ? String(colValues[8][0]) : '',
        udiseCode: colValues[9][0] ? String(colValues[9][0]) : '',
        visitStartTime: colValues[10][0] ? String(colValues[10][0]) : '',
        principalName: '',
        principalContact: '',
        totalTeachers: '',
        totalStudents: colValues[11][0] ? String(colValues[11][0]) : '',
        totalWorkingComputers: '',
        internetFacility: '',
        smartClass: '',
        schoolRemark: '',
        ratingInfra: '',
        ratingMgmt: '',
        ratingEngagement: '',
        ratingRemark: '',
        mood: '',
        highlight: colValues[12][0] ? String(colValues[12][0]) : '',
        challenges: colValues[13][0] ? String(colValues[13][0]) : '',
        hasComplaint: colValues[14][0] ? String(colValues[14][0]) : '',
        complaintDetails: colValues[15][0] ? String(colValues[15][0]) : '',
        suggestions: colValues[16][0] ? String(colValues[16][0]) : ''
      };
      allVisits.push(visitRecord);
    }

    var latestVisit = allVisits[allVisits.length - 1];
    return respondJSON({ status: 'success', data: latestVisit, allVisits: allVisits });

  } catch (e) {
    return respondJSON({ status: 'error', message: e.toString() });
  }
}

function processRequest(jsonString) {
  try {
    var lock = LockService.getScriptLock();
    lock.tryLock(15000);

    var data = JSON.parse(jsonString);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    var trainerName = data.trainerName || 'Trainer';
    var stateName = data.state || 'UP';
    var stateAbbrev = getAbbreviation(stateName);
    var activityType = data.activityType || 'LOG';

    // 1. HANDLE TRAINER TAB DELETION
    if (activityType === 'DELETE_TRAINER_TAB') {
      removeTrainerTab(ss, trainerName, stateAbbrev);
      if (lock) lock.releaseLock();
      return respondJSON({ status: 'success', message: 'Trainer tab removed' });
    }

    // 2. GET OR CREATE TRAINER TAB WITH COLUMN MATRIX LAYOUT
    var trainerSheet = getOrCreateTrainerMatrixSheet(ss, trainerName, stateAbbrev, data);

    // 3. SAFE GOOGLE DRIVE FOLDER & PHOTO UPLOAD
    var drivePhotoUrl = "";
    var driveFolderUrl = "";

    try {
      var dateStr = data.dateStr || getFormattedDate();
      var activeSchoolName = data.schoolName || "";

      if (!activeSchoolName) {
        var lastCol = Math.max(trainerSheet.getLastColumn(), 1);
        var row8Vals = trainerSheet.getRange(8, 1, 1, lastCol).getValues()[0];
        for (var c = row8Vals.length - 1; c >= 1; c--) {
          if (row8Vals[c] && String(row8Vals[c]).indexOf(dateStr) !== -1) {
            var sName = String(trainerSheet.getRange(17, c + 1).getValue() || "").trim();
            if (sName) {
              activeSchoolName = sName;
              data.schoolName = sName;
              break;
            }
          }
        }
      }

      var driveFolders = ensureTrainerDriveFolders(trainerName, stateAbbrev, dateStr, data.status, activeSchoolName);

      if (driveFolders && driveFolders.dateFolder) {
        driveFolderUrl = driveFolders.dateFolder.getUrl();
      }

      if (data.photoBase64 && data.status !== 'on_leave' && driveFolders && driveFolders.dateFolder) {
        drivePhotoUrl = savePhotoBlobToDrive(driveFolders.dateFolder, data.photoBase64, data.photoName || "Present");
      } else if (data.photoUrl) {
        drivePhotoUrl = data.photoUrl;
      }
    } catch (driveErr) {
      Logger.log("Drive Error: " + driveErr.toString());
    }

    var row16DriveLink = drivePhotoUrl || driveFolderUrl;

    // 4. WRITE DATA INTO THE DATE COLUMN
    writeToDateColumn(trainerSheet, data, row16DriveLink);

    // 5. UPDATE MASTER "ALL SCHOOL REPORT" TAB ONLY WHEN SCHOOL INSPECTION REPORT IS SUBMITTED
    var isSchoolReportData = (activityType === 'School Details' || activityType === 'School Rating') ||
      (data.principalName || data.totalTeachers || data.totalWorkingComputers || data.ratingInfra || data.schoolRemark || data.smartClass);

    if (isSchoolReportData) {
      updateAllSchoolReportSheet(ss, trainerName, stateAbbrev, data);
    }

    if (lock) lock.releaseLock();
    return respondJSON({ status: 'success', message: 'Logged to Google Sheet and Drive successfully', drivePhotoUrl: row16DriveLink });

  } catch (error) {
    return respondJSON({ status: 'error', message: error.toString() });
  }
}

/**
 * Ensures Google Drive Folder structure safely:
 * Root > "TrainerName (State)" > "DD-MM-YYYY_SchoolName"
 */
function ensureTrainerDriveFolders(trainerName, stateAbbrev, dateStr, status, schoolName) {
  try {
    var rootFolder = null;
    try {
      if (DRIVE_ROOT_FOLDER_ID && DRIVE_ROOT_FOLDER_ID.length > 5) {
        rootFolder = DriveApp.getFolderById(DRIVE_ROOT_FOLDER_ID);
      }
    } catch (e) {
      rootFolder = null;
    }

    if (!rootFolder) {
      rootFolder = getOrCreateFolder(DriveApp.getRootFolder(), "Trainer's Drive");
    }

    var trainerFolderName = trainerName.trim() + " (" + stateAbbrev.toUpperCase() + ")";
    var trainerFolder = getOrCreateFolder(rootFolder, trainerFolderName);

    var dateFolder = null;
    if (status !== 'on_leave' && schoolName && String(schoolName).trim().length > 0) {
      var formattedDateFolder = dateStr.replace(/\//g, "-");
      var cleanSchool = String(schoolName).trim().replace(/[\/\\:\*\?"<>\|]/g, "");
      var visitFolderName = formattedDateFolder + "_" + cleanSchool;
      dateFolder = getOrCreateFolder(trainerFolder, visitFolderName);
    }

    return { trainerFolder: trainerFolder, dateFolder: dateFolder };
  } catch (err) {
    Logger.log("Drive Folder Creation Error: " + err.toString());
    return null;
  }
}

/**
 * Saves Base64 photo into dateFolder as "Present.jpg"
 */
function savePhotoBlobToDrive(dateFolder, base64Data, photoFileName) {
  try {
    var contentType = "image/jpeg";
    var base64Clean = base64Data;
    if (base64Data.indexOf("data:") === 0) {
      var parts = base64Data.split(",");
      contentType = parts[0].match(/:(.*?);/)[1];
      base64Clean = parts[1];
    }

    var decoded = Utilities.base64Decode(base64Clean);
    var fileName = photoFileName || "Present.jpg";
    if (fileName.indexOf(".") === -1) {
      fileName += ".jpg";
    }
    var blob = Utilities.newBlob(decoded, contentType, fileName);

    var file = dateFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return file.getUrl();
  } catch (err) {
    Logger.log("Failed to save image file: " + err.toString());
    return "";
  }
}

/**
 * Gets or creates the Trainer Sheet in exact "TrainerName (State)" layout
 */
function getOrCreateTrainerMatrixSheet(ss, trainerName, stateAbbrev, data) {
  var tabName = trainerName.trim() + " (" + stateAbbrev.toUpperCase() + ")";
  var sheet = ss.getSheetByName(tabName);

  if (!sheet) {
    sheet = ss.insertSheet(tabName);

    // Header Rows 2-5 (Trainer Info Box)
    sheet.getRange("A2").setValue("Trainer Name").setFontWeight("bold");
    sheet.getRange("B2").setValue(trainerName);

    sheet.getRange("A3").setValue("State").setFontWeight("bold");
    sheet.getRange("B3").setValue(stateAbbrev.toUpperCase());

    sheet.getRange("A4").setValue("Assigned district").setFontWeight("bold");
    sheet.getRange("B4").setValue(data.district || "District");

    sheet.getRange("A5").setValue("Login Credentials").setFontWeight("bold");
    sheet.getRange("B5").setValue(trainerName + " / 123456");

    sheet.getRange("A2:A5").setBackground("#f1f5f9").setFontColor("#0f172a");

    // Row 8 Header
    sheet.getRange("A8").setValue("Date").setFontWeight("bold").setBackground("#dc2626").setFontColor("#ffffff");

    // Row 9-25 Fixed Metric Labels in Column A
    var metricLabels = [
      ["Attendance Status"],                   // Row 9
      ["Leave Reason"],                        // Row 10
      ["Clock In Time"],                       // Row 11
      ["Clock Out Time"],                      // Row 12
      ["Working Hours"],                       // Row 13
      ["Clock In Live GPS Location"],          // Row 14
      ["Clock Out Live GPS Location"],         // Row 15
      ["Attendance Geotag Image (Drive Link)"],// Row 16
      ["School Visited Name"],                 // Row 17
      ["School UDISE Code"],                   // Row 18
      ["School Visit Start Time"],             // Row 19
      ["Total Student Trained"],               // Row 20
      ["EOD Highlight"],                       // Row 21
      ["EOD Challenges"],                      // Row 22
      ["EOD Has Complaint"],                   // Row 23
      ["EOD Complaint Details"],               // Row 24
      ["EOD Suggestions"]                      // Row 25
    ];

    sheet.getRange(9, 1, metricLabels.length, 1).setValues(metricLabels).setFontWeight("bold").setBackground("#f8fafc");
    sheet.setColumnWidth(1, 260);
    sheet.setFrozenColumns(1);
  }

  return sheet;
}

/**
 * Writes data into the column corresponding to current Date (Column B, C, D...)
 * For additional school visits on the same date, appends a NEW column with a BLUE highlighted date header!
 */
function writeToDateColumn(sheet, data, driveLink) {
  var dateStr = data.dateStr || getFormattedDate(); // DD/MM/YYYY

  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var targetCol = -1;
  var isSecondaryVisit = false;

  var row8Values = sheet.getRange(8, 1, 1, lastCol).getValues()[0];
  var existingColsForDate = [];

  for (var c = 1; c < row8Values.length; c++) {
    var headerVal = String(row8Values[c] || "").trim();
    if (headerVal && headerVal.indexOf(dateStr) !== -1) {
      existingColsForDate.push(c + 1);
    }
  }

  if (existingColsForDate.length > 0) {
    var newSchoolClean = String(data.schoolName || "").trim().toLowerCase();
    var foundMatch = false;

    for (var i = existingColsForDate.length - 1; i >= 0; i--) {
      var colIdx = existingColsForDate[i];
      var colSchoolName = String(sheet.getRange(17, colIdx).getValue() || "").trim().toLowerCase();
      var colCheckOut = String(sheet.getRange(12, colIdx).getValue() || "").trim();

      // 1. If schoolName matches this column: update THIS column!
      if (newSchoolClean && colSchoolName && (colSchoolName.indexOf(newSchoolClean) !== -1 || newSchoolClean.indexOf(colSchoolName) !== -1)) {
        targetCol = colIdx;
        foundMatch = true;
        if (i > 0) isSecondaryVisit = true;
        break;
      }
      // 2. If column has an empty school name and no checkout yet (e.g. fresh/empty column), reuse it!
      else if (!colSchoolName && !colCheckOut) {
        targetCol = colIdx;
        foundMatch = true;
        if (i > 0) isSecondaryVisit = true;
        break;
      }
      // 3. If column doesn't have checkOut yet (active visit session) and we're not explicitly creating a new visit clock-in:
      else if (!colCheckOut && !data.isNewVisit && data.activityType !== 'Clock In') {
        targetCol = colIdx;
        foundMatch = true;
        if (i > 0) isSecondaryVisit = true;
        break;
      }
    }

    if (!foundMatch) {
      if (data.isNewVisit) {
        targetCol = lastCol + 1;
        isSecondaryVisit = true;
      } else {
        // Reuse the latest column for this date
        targetCol = existingColsForDate[existingColsForDate.length - 1];
        if (existingColsForDate.length > 1) isSecondaryVisit = true;
      }
    }
  } else {
    // 1st Column for this date
    targetCol = lastCol + 1;
    if (lastCol === 1 && !row8Values[1]) targetCol = 2; // Column B
    isSecondaryVisit = false;
  }

  // Set Row 8 Header
  var visitNum = existingColsForDate.length + (targetCol > lastCol ? 1 : 0);
  var headerLabel = isSecondaryVisit ? (dateStr + " (Visit " + visitNum + ")") : dateStr;
  var headerBgColor = isSecondaryVisit ? "#2563eb" : "#dc2626"; // BLUE (#2563eb) for Visit 2+, RED (#dc2626) for Visit 1

  sheet.getRange(8, targetCol)
    .setValue(headerLabel)
    .setFontWeight("bold")
    .setBackground(headerBgColor)
    .setFontColor("#ffffff")
    .setHorizontalAlignment("center");

  sheet.setColumnWidth(targetCol, 220);

  function setVal(rowIdx, value) {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      sheet.getRange(rowIdx, targetCol).setValue(value);
    }
  }

  if (data.status) setVal(9, data.status === 'present' ? 'Clock In (Present)' : data.status === 'on_leave' ? 'On Leave' : 'Absent');
  if (data.leaveReason) setVal(10, data.leaveReason);
  if (data.checkIn) setVal(11, data.checkIn);
  if (data.checkOut) setVal(12, data.checkOut);
  if (data.workingHours) setVal(13, data.workingHours + ' hrs');
  if (data.clockInLocation) setVal(14, data.clockInLocation);
  if (data.clockOutLocation) setVal(15, data.clockOutLocation);
  if (driveLink) setVal(16, driveLink);

  if (data.schoolName) setVal(17, data.schoolName);
  if (data.udiseCode) setVal(18, data.udiseCode);
  if (data.visitStartTime) setVal(19, data.visitStartTime);

  var totalTrained = data.totalStudentsTrained || data.totalStudents;
  if (totalTrained !== undefined && totalTrained !== null && String(totalTrained).trim() !== "") setVal(20, totalTrained);

  if (data.highlight) setVal(21, data.highlight);
  if (data.challenges) setVal(22, data.challenges);
  if (data.hasComplaint !== undefined) setVal(23, data.hasComplaint ? 'Yes' : 'No');
  if (data.complaintDetails) setVal(24, data.complaintDetails);
  if (data.suggestions) setVal(25, data.suggestions);
}

/**
 * Updates Master "All School Report" Sheet (Single Row Per School UPSERT)
 */
function updateAllSchoolReportSheet(ss, trainerName, stateName, data) {
  if (!data) return;
  if (!data.schoolName && !data.udiseCode) return;
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();

  var master = ss.getSheetByName("All School Report");
  if (!master) {
    master = ss.insertSheet("All School Report", 0);
    var headers = [
      ["Date", "State", "District", "Trainer Name", "School Name", "UDISE Code", "Principal Name", "Principal Contact", "Total Teachers", "Total Students", "Working PCs", "Internet", "Smart Class", "Infra Rating", "Mgmt Rating", "Engagement Rating", "Remarks"]
    ];
    master.getRange(1, 1, 1, 17).setValues(headers).setBackground("#0f172a").setFontColor("#ffffff").setFontWeight("bold");
    master.setFrozenRows(1);
  }

  var targetRow = -1;
  var lastRow = master.getLastRow();
  var schoolNameClean = String(data.schoolName || "").trim().toLowerCase();
  var udiseClean = String(data.udiseCode || "").trim();

  if (lastRow > 1) {
    var values = master.getRange(2, 1, lastRow - 1, 17).getValues();
    for (var i = 0; i < values.length; i++) {
      var rowUDISE = String(values[i][5] || "").trim();                 // Column F (UDISE Code)
      var rowSchoolName = String(values[i][4] || "").trim().toLowerCase(); // Column E (School Name)

      if ((udiseClean && rowUDISE === udiseClean) || (schoolNameClean && rowSchoolName === schoolNameClean)) {
        targetRow = i + 2; // Rows are 1-indexed, starts after header row 1
        break;
      }
    }
  }

  function setCell(colIdx, val) {
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      master.getRange(targetRow, colIdx).setValue(val);
    }
  }

  if (targetRow === -1) {
    // New School: Append 1 Row
    master.appendRow([
      data.dateStr || getFormattedDate(),
      stateName,
      data.district || '',
      trainerName,
      data.schoolName || '',
      data.udiseCode || '',
      data.principalName || '',
      data.principalContact || '',
      data.totalTeachers !== undefined ? data.totalTeachers : '',
      data.totalStudents !== undefined ? data.totalStudents : '',
      data.totalWorkingComputers !== undefined ? data.totalWorkingComputers : '',
      data.internetFacility || '',
      data.smartClass || '',
      data.ratingInfra ? data.ratingInfra + '/5' : '',
      data.ratingMgmt ? data.ratingMgmt + '/5' : '',
      data.ratingEngagement ? data.ratingEngagement + '/5' : '',
      data.schoolRemark || data.ratingRemark || ''
    ]);
  } else {
    // Existing School: Update in the same row!
    setCell(1, data.dateStr || getFormattedDate());
    setCell(2, stateName);
    if (data.district) setCell(3, data.district);
    if (trainerName) setCell(4, trainerName);
    if (data.schoolName) setCell(5, data.schoolName);
    if (data.udiseCode) setCell(6, data.udiseCode);
    if (data.principalName) setCell(7, data.principalName);
    if (data.principalContact) setCell(8, data.principalContact);
    if (data.totalTeachers !== undefined) setCell(9, data.totalTeachers);
    if (data.totalStudents !== undefined) setCell(10, data.totalStudents);
    if (data.totalWorkingComputers !== undefined) setCell(11, data.totalWorkingComputers);
    if (data.internetFacility) setCell(12, data.internetFacility);
    if (data.smartClass) setCell(13, data.smartClass);
    if (data.ratingInfra !== undefined) setCell(14, data.ratingInfra + '/5');
    if (data.ratingMgmt !== undefined) setCell(15, data.ratingMgmt + '/5');
    if (data.ratingEngagement !== undefined) setCell(16, data.ratingEngagement + '/5');
    if (data.schoolRemark || data.ratingRemark) setCell(17, data.schoolRemark || data.ratingRemark);
  }
}

/**
 * Helper to get or create folder inside parent folder
 */
function getOrCreateFolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(folderName);
}

/**
 * Removes Trainer tab permanently when deleted by Admin
 */
function removeTrainerTab(ss, trainerName, stateAbbrev) {
  var tabName = trainerName.trim() + " (" + (stateAbbrev ? stateAbbrev.toUpperCase() : "UP") + ")";
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    var allSheets = ss.getSheets();
    for (var i = 0; i < allSheets.length; i++) {
      if (allSheets[i].getName().indexOf(trainerName) !== -1) {
        sheet = allSheets[i];
        break;
      }
    }
  }
  if (sheet && ss.getSheets().length > 1) {
    ss.deleteSheet(sheet);
  }
}

function getAbbreviation(stateName) {
  if (!stateName) return 'UP';
  var s = stateName.toLowerCase();
  if (s.indexOf('delhi') !== -1 || s === 'dl') return 'DL';
  if (s.indexOf('goa') !== -1 || s === 'ga') return 'GA';
  if (s.indexOf('uttar') !== -1 || s === 'up') return 'UP';
  return stateName.substring(0, 2).toUpperCase();
}

function getFormattedDate() {
  var today = new Date();
  var dd = String(today.getDate()).padStart(2, '0');
  var mm = String(today.getMonth() + 1).padStart(2, '0');
  var yyyy = today.getFullYear();
  return dd + '/' + mm + '/' + yyyy;
}

function respondJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function cleanTimeStr(val) {
  if (!val) return '';
  var s = String(val).trim();
  if (s.indexOf('GMT') !== -1 || s.indexOf('1899') !== -1) {
    try {
      var d = new Date(s);
      var hours = d.getHours();
      var minutes = d.getMinutes();
      var ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      var minutesStr = minutes < 10 ? '0' + minutes : minutes;
      return hours + ':' + minutesStr + ' ' + ampm;
    } catch (e) {
      return s;
    }
  }
  return s;
}

function handleGetSchoolReportData(schoolName, udiseCode) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("All School Report");
    if (!sheet) {
      return respondJSON({ status: 'not_found', message: 'All School Report sheet not found' });
    }

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return respondJSON({ status: 'no_data', message: 'No school report data present' });
    }

    var values = sheet.getRange(2, 1, lastRow - 1, 17).getDisplayValues();
    var targetRowIdx = -1;
    var schoolNameClean = String(schoolName || "").trim().toLowerCase();
    var udiseClean = String(udiseCode || "").trim();

    for (var i = 0; i < values.length; i++) {
      var rowUDISE = String(values[i][5] || "").trim();                 // Column F (UDISE Code)
      var rowSchoolName = String(values[i][4] || "").trim().toLowerCase(); // Column E (School Name)

      if ((udiseClean && rowUDISE === udiseClean) || (schoolNameClean && rowSchoolName === schoolNameClean)) {
        targetRowIdx = i;
        break;
      }
    }

    if (targetRowIdx === -1) {
      return respondJSON({ status: 'no_data', message: 'School report not found' });
    }

    var rowValues = values[targetRowIdx];
    var data = {
      dateStr: rowValues[0],
      state: rowValues[1],
      district: rowValues[2],
      trainerName: rowValues[3],
      schoolName: rowValues[4],
      udiseCode: rowValues[5],
      principalName: rowValues[6],
      principalContact: rowValues[7],
      totalTeachers: rowValues[8] ? parseInt(rowValues[8], 10) : 0,
      totalStudents: rowValues[9] ? parseInt(rowValues[9], 10) : 0,
      totalWorkingComputers: rowValues[10] ? parseInt(rowValues[10], 10) : 0,
      internetFacility: rowValues[11],
      smartClass: rowValues[12],
      ratingInfra: extractRatingNum(rowValues[13]),
      ratingMgmt: extractRatingNum(rowValues[14]),
      ratingEngagement: extractRatingNum(rowValues[15]),
      schoolRemark: rowValues[16]
    };

    return respondJSON({ status: 'success', data: data });

  } catch (e) {
    return respondJSON({ status: 'error', message: e.toString() });
  }
}

function extractRatingNum(val) {
  if (!val) return 0;
  var clean = String(val).replace(/[^0-9\.]/g, '');
  var num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}
