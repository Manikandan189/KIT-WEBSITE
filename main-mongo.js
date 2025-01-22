const mongoose=require('mongoose')
const express=require('express')
const QRCode = require('qrcode');
const bodyParser=require('body-parser')
const path=require('path')
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const {Account,Database,ToDatabase,Feedback,xeroxRequests,shopOwner,Admin,earnings}=require('./schema-mongo');
const bcrypt = require('bcrypt');
require('dotenv').config({path: './ImportantLinks.env'});
const app=express()
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('css'));
app.use(express.static('js'));
app.use(express.static('img'));

async function run() {
    try {
      await mongoose.connect(process.env.uri); 
      console.log("Connected successfully to MongoDB!");
    } catch (error) {
      console.error("Error connecting to MongoDB:", error.message);
    }
  }
  run();

  app.use(session({
    secret: 'ChangeLaterNoNeedNow', 
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false,  
        maxAge: 10 * 60 * 1000 // 10 minutes (in milliseconds)
    }
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'html','html-home.html'));
});
app.get('/Departments', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'html-departments.html'));
});


app.get('/Admin_options',ensureLoggedInAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'html-admin-options.html'));
});







app.get('/Database', async (req, res) => {
    try {
        const search = req.query.search_input;
        let requests;
        if(search)
        {
            requests = await ToDatabase.find({ $or: [
                { register_number:{ $regex: search, $options: 'i' } },
                { department: { $regex: search, $options: 'i' }},
                {student_name: { $regex: search, $options: 'i' }},
                {purpose_of_outpass:{ $regex: search, $options: 'i' }},
                {year:{ $regex: search, $options: 'i' }},
                {parent_conduct_number:{ $regex: search, $options: 'i' }}
            ],}).exec(); 
        }
        else{
        requests = await ToDatabase.find({}).exec();    
        }
        res.render('FinalDatabase', { database: requests});
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});




// Make the route handler async
app.get('/Accounts', ensureLoggedInAdmin,async (req, res) => {
    try {
        const Acc = await Account.find();
        res.render('Accounts', { accounts: Acc });
    } catch (error) {
        console.error("Error fetching accounts:", error);
        res.status(500).json({ message: "Error fetching accounts" });
    }
});

app.get('/EditAccount/:id', async (req, res) => {
    try {
        const account = await Account.findById(req.params.id);
        if (!account) {
            return res.status(404).send("Account not found");
        }
        res.render('EditAccount', { account });
    } catch (error) {
        console.error("Error fetching account for editing:", error);
        res.status(500).send("Error fetching account");
    }
});

app.post('/EditAccount/:id', async (req, res) => {
    try {
        const { first_name_R, last_name_R, email_id_R, phone_number_R, department_R, create_password_R } = req.body;
        const hashpass=await bcrypt.hash(create_password_R,10);
        await Account.findByIdAndUpdate(req.params.id, {
            first_name_R,
            last_name_R,
            email_id_R,
            phone_number_R,
            department_R,
            create_password_R:hashpass
        });

        res.redirect('/Accounts'); // Redirect back to the accounts page
    } catch (error) {
        console.error("Error updating account:", error);
        res.status(500).send("Error updating account");
    }
});

app.get('/ChangePassword', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'html-forgotPassword.html'));
});

app.post('/ChangePassword', async (req, res) => {
    try {
        const { F_email, F_id, F_newpass, F_repass } = req.body;
        if (F_newpass !== F_repass) {
            return res.status(400).json({ message: "Passwords do not match!" });
        }
        if (F_id !== "5000") {
            return res.status(403).json({ message: "Unauthorized action!" });
        }
        const account = await Account.findOne({ email_id_R: F_email });
        if (!account) {
            return res.status(404).json({ message: "Account not found!" });
        }
        account.create_password_R = await bcrypt.hash(F_newpass,10);
        await account.save();
        res.redirect('/StudentLogin');
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred while updating the password!" });
    }
});



//LoginRegister
app.get('/LoginRegister', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'html-login-register.html'));
});

app.post('/LoginRegister', async (req, res) => {
    try {
        const { image_R, first_name_R, last_name_R, email_id_R, create_password_R, re_password_R, register_number_R, phone_number_R, department_R, year_R, address_R } = req.body;
        if (create_password_R !== re_password_R) {
            return res.status(400).json({ message: "Passwords do not match" });
        }
        const existingUser = await Account.findOne({ email_id_R });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        const hashedpass=await bcrypt.hash(create_password_R,10);
        console.log(hashedpass);
        const newUser = new Account({
            image_R,
            first_name_R,
            last_name_R,
            email_id_R,
            create_password_R:hashedpass,
            register_number_R,
            phone_number_R,
            department_R,
            year_R,
            address_R,
        });
        await newUser.save();
        res.redirect('/StudentLogin');

    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: "Error registering user", error: error.message });
    }
});

function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next(); 
    } else {
        return res.redirect('/StudentLogin');
    }
}

function ensureLoggedInAdvisor(req, res, next) {
    if (req.session.loggedIn===process.env.advisorEmail) {
        return next();
    }
    else{
    return res.redirect('/AdvisorLogin');
}
}
function ensureLoggedInHod(req, res, next) {
    if (req.session.loggedIn===process.env.hodEmail) {
        return next();
    }
    else{
    return res.redirect('/StaffLogin');
}
}
function ensureLoggedInPrincipal(req, res, next) {
    if (req.session.loggedIn===process.env.principalEmail) {
        return next();
    }
    else{
    return res.redirect('/PrincipalLogin');
}
}
function ensureLoggedInAdmin(req, res, next) {
    if (req.session.loggedIn===process.env.adminEmail) {
        return next();
    }
    else{
    return res.redirect('/AdminLogin');
}
}




//Studentlogin
app.get('/StudentLogin', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'html-student-login.html'));
});
app.post('/StudentLogin', async (req, res) => {
    try {
        const { student_email, student_password} = req.body;
        const user = await Account.findOne({ email_id_R :student_email});
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        console.log(student_password);
        console.log(user.create_password_R);
        const isMatch = await bcrypt.compare(student_password, user.create_password_R);

        if (!isMatch) {
            return res.redirect('/StudentLogin'); 
        }
        req.session.user = {
            image_S:user.image_R,
            email_S: user.email_id_R,
            firstName_S: user.first_name_R,
            lastName_S: user.last_name_R,
            registerNumber_S: user.register_number_R,
            department_S: user.department_R,
            year_S: user.year_R,
            phoneNumber_S: user.phone_number_R,
            address_S: user.address_R
        };
        
            res.redirect('/Register')
    } catch (error) {
        console.error("Error logging in:");
        res.status(500).json({ message: "Error logging in", error: error.message });
    }
});





//Advisorlogin
app.get('/AdvisorLogin', (req, res) => {
    res.sendFile(path.join(__dirname,'html', 'html-advisor-login.html'));
});
app.post('/AdvisorLogin',async (req,res)=>{
    try{
        const{advisor_email ,advisor_password}=req.body;
        console.log(advisor_email,"===",process.env.advisorEmail);
        console.log(advisor_password,"=====",process.env.advisorPassword);
        if(advisor_email===process.env.advisorEmail && advisor_password===process.env.advisorPassword)
        {
            req.session.loggedIn=process.env.advisorEmail;
        res.redirect('/AdvisorVerify')
        }
    else
    res.status(500).json({ message: "INVALID USER OR PASSWORD"});
    }
    catch(error){
        res.redirect('/AdvisorLogin')
    }

});




//stafflogin
app.get('/StaffLogin', (req, res) => {
    res.sendFile(path.join(__dirname,'html', 'html-staff-login.html'));
});
app.post('/StaffLogin',async (req,res)=>{
    try{
        const{staff_email ,staff_password}=req.body;
        if(staff_email===process.env.hodEmail && staff_password===process.env.hodPassword)
        {
            req.session.loggedIn=process.env.hodEmail;
        res.redirect('/StaffVerify');
        }
        else
        res.status(500).json({ message: "INVALID USER OR PASSWORD"});
    }
    catch(error){
        res.redirect('/StaffLogin')
    }

});



//PrincipalLogin
app.get('/PrincipalLogin', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'html-principal-login.html'));
});
app.post('/PrincipalLogin',async (req,res)=>{
    try{
        const{principal_email ,principal_password}=req.body;
        if(principal_email===process.env.principalEmail && principal_password===process.env.principalPassword)
        {
            req.session.loggedIn=process.env.principalEmail;
        res.redirect('/PrincipalVerify')
        }
        else
        res.status(500).json({ message: "INVALID USER OR PASSWORD"});
    }
    catch(error){
        res.redirect('/PrincipalLogin')
    }
});



//SecurityLogin
app.get('/AdminLogin', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'html-admin-login.html'));
});
app.post('/AdminLogin',async (req,res)=>{
    try{
        const{security_email ,security_password}=req.body;
        if(security_email===process.env.adminEmail && security_password===process.env.adminPassword)
        {
            req.session.loggedIn=process.env.adminEmail;
        res.redirect('/Admin_options')
        }
        else
        res.status(500).json({ message: "INVALID USER OR PASSWORD"});
    }
    catch(error){
        res.redirect('/AdminLogin')
    }

})

//login page and login register page completed above
app.get('/Who', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'html-who.html'));
});
app.get('/Register', isAuthenticated,(req, res) => {
    res.render('html-register', { user: req.session.user });
});

app.get('/OutpassRegister', isAuthenticated,(req, res) => {
    if (!req.session.user) {
        return res.redirect('/StudentLogin');
    }
    res.render('OutpassRegister', { user: req.session.user });
});
app.get('/OndutyRegister',isAuthenticated, (req, res) => {
    if (!req.session.user) {
        return res.redirect('/StudentLogin');
    }
    res.render('OndutyRegister', { user: req.session.user });
});


// Handle the form submission
app.post('/Register', async (req, res) => {
    try {
        if (!req.session.user) {
            return res.redirect('/StudentLogin');
        }
    

        const { purpose_of_outpass, from_date, to_date, type } = req.body;
        const { firstName_S, lastName_S, registerNumber_S, year_S, department_S, address_S, phoneNumber_S, image_S } = req.session.user;

        console.log("Type of outpass requested:", type);
        let count = 1;

        // Check if a record with the same register number and type exists
        const existingRecord = await Database.findOne({
            register_number: registerNumber_S,
            parent_conduct_number: phoneNumber_S,
            type: type
        });
    
        // If a record exists, increment the count or delete the record
        if (existingRecord) {
            count = existingRecord.count + 1;
            console.log("Existing record found, deleting...");
            await Database.deleteOne({ register_number: registerNumber_S, parent_conduct_number: phoneNumber_S, type: type });
            console.log("deleted...");
        } 

        // Create a new record for the student's outpass request
        const newstu = new Database({
            student_name: `${firstName_S} ${lastName_S}`,
            register_number: registerNumber_S,
            department: department_S,
            year: year_S,
            purpose_of_outpass,
            parent_conduct_number: phoneNumber_S,
            address: address_S,
            from_date,
            to_date,
            status: 'advisor', // Initial status
            type: type,        // Type of pass
            image: image_S,    // Student image
            count: count
        });

        // Save student request
        await newstu.save();

        return res.json({ success: true, message: "Request sent to class Advisor successfully." });
    } catch (error) {
        console.error("Error registering user:", error);
        return res.status(500).json({ success: false, message: "Error registering user", error: error.message });
    }
});

//staffverify section
let dept=" ";
app.post('/StaffVerify1', async (req, res) => {
    try {
        const { department } = req.body;
        dept=department;
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});
//Advisor verify section
app.get('/AdvisorVerify',ensureLoggedInAdvisor, async (req, res) => {
    try {
        const search = req.query.search_input;
        const validDepartments = ['cse', 'csbs', 'aids', 'mech', 'aero', 'agri', 'eee', 'ece', 'bme', 'biotech', 'aiml', 'mca'];
        let students;
    
        if (search && validDepartments.includes(dept)) {
            students = await Database.find({ 
                department: dept.toUpperCase(),
                $or: [
                    { register_number:{ $regex: search, $options: 'i' } },
                    { department: { $regex: search, $options: 'i' }},
                    {student_name: { $regex: search, $options: 'i' }},
                    {purpose_of_outpass:{ $regex: search, $options: 'i' }},
                    {year:{ $regex: search, $options: 'i' }},
                    {parent_conduct_number:{ $regex: search, $options: 'i' }}
                ],
                status: 'advisor',
                 type: 'homepass' }).exec();
        } else {
            students = await Database.find({  department: dept.toUpperCase(),status: 'advisor', type: 'homepass' }).exec();
        }
        let homepassCount=0,outpassCount=0,ondutypassCount=0;
        try{
        homepassCount = await Database.countDocuments({type: 'homepass',department: dept.toUpperCase(),status:'advisor',});
        outpassCount = await Database.countDocuments({type: 'outpass',department: dept.toUpperCase(),status:'advisor',});
        ondutypassCount = await Database.countDocuments({type: 'onduty',department: dept.toUpperCase(),status:'advisor', });
        }
        catch{
            console.log("Error counting database");
        }
        res.render('AdvisorVerify', { students: students,homepassCount :homepassCount,outpassCount:outpassCount,ondutypassCount:ondutypassCount});
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
    
});
app.post('/AdvisorVerify', async (req, res) => {
    try {
        const {rejected_btn, Approv_btn, S_Id,status } = req.body;
        if (Approv_btn==="accept" && S_Id && status==="advisor") {
            const student = await Database.findById(S_Id);
            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }
           student.status="hod";
           await student.save();
        }
        if (rejected_btn==="reject" && S_Id) {
            const deleteResult = await Database.deleteOne({ _id: S_Id });
            console.log('Delete Result:', deleteResult); 
        }
        res.redirect('/AdvisorVerify');
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ message: 'Error processing request', error: error.message });
    }
});
app.get('/AdvisorVerifyOutpass',ensureLoggedInAdvisor,async (req, res) => {
    try {
        const search = req.query.search_input;
        const validDepartments = ['cse', 'csbs', 'aids', 'mech', 'aero', 'agri', 'eee', 'ece', 'bme', 'biotech', 'aiml', 'mca'];
        let students;
    
        if (search &&  validDepartments.includes(dept)) {
            students = await Database.find({ department: dept.toUpperCase(),
                $or: [
                    { register_number:{ $regex: search, $options: 'i' } },
                    { department: { $regex: search, $options: 'i' }},
                    {student_name: { $regex: search, $options: 'i' }},
                    {purpose_of_outpass:{ $regex: search, $options: 'i' }},
                    {year:{ $regex: search, $options: 'i' }},
                    {parent_conduct_number:{ $regex: search, $options: 'i' }}
                ],
                 status: 'advisor', type: 'outpass' }).exec();
        } else {
            students = await Database.find({department: dept.toUpperCase(), status: 'advisor', type: 'outpass' }).exec();
        }
        let homepassCount=0,outpassCount=0,ondutypassCount=0;
        try{
        homepassCount = await Database.countDocuments({type: 'homepass',department: dept.toUpperCase(),status:'advisor',});
        outpassCount = await Database.countDocuments({type: 'outpass',department: dept.toUpperCase(),status:'advisor',});
        ondutypassCount = await Database.countDocuments({type: 'onduty',department: dept.toUpperCase(),status:'advisor', });
        }
        catch{
            console.log("Error counting database");
        }
        res.render('AdvisorVerifyOutpass', { students: students,homepassCount :homepassCount,outpassCount:outpassCount,ondutypassCount:ondutypassCount});
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});
app.post('/AdvisorVerifyOutpass', async (req, res) => {
    try {
        const {rejected_btn, Approv_btn, S_Id,status } = req.body;
        if (Approv_btn==="accept" && S_Id && status==="advisor") {
            const student = await Database.findById(S_Id);
            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }
           student.status="hod";
           await student.save();
           console.log("st",status);
        }
        if (rejected_btn==="reject" && S_Id) {
            const deleteResult = await Database.deleteOne({ _id: S_Id });
            console.log('Delete Result:', deleteResult); 
        }
    

        res.redirect('/AdvisorVerifyOutpass');
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ message: 'Error processing request', error: error.message });
    }
});
app.get('/AdvisorVerifyOnduty', ensureLoggedInAdvisor,async (req, res) => {
    try {
        const search = req.query.search_input;
        const validDepartments = ['cse', 'csbs', 'aids', 'mech', 'aero', 'agri', 'eee', 'ece', 'bme', 'biotech', 'aiml', 'mca'];
        let students;
    
        if (search && validDepartments.includes(dept)) {
            students = await Database.find({ department: dept.toUpperCase(),
                $or: [
                    { register_number:{ $regex: search, $options: 'i' } },
                    { department: { $regex: search, $options: 'i' }},
                    {student_name: { $regex: search, $options: 'i' }},
                    {purpose_of_outpass:{ $regex: search, $options: 'i' }},
                    {year:{ $regex: search, $options: 'i' }},
                    {parent_conduct_number:{ $regex: search, $options: 'i' }}
                ],
                 status: 'advisor', type: 'onduty' }).exec();
        } else {
            students = await Database.find({department: dept.toUpperCase(), status: 'advisor', type: 'onduty' }).exec();
        }
        let homepassCount=0,outpassCount=0,ondutypassCount=0;
        try{
        homepassCount = await Database.countDocuments({type: 'homepass',department: dept.toUpperCase(),status:'advisor',});
        outpassCount = await Database.countDocuments({type: 'outpass',department: dept.toUpperCase(),status:'advisor',});
        ondutypassCount = await Database.countDocuments({type: 'onduty',department: dept.toUpperCase(),status:'advisor', });
        }
        catch{
            console.log("Error counting database");
        }
        res.render('AdvisorVerifyOnduty', { students: students,homepassCount :homepassCount,outpassCount:outpassCount,ondutypassCount:ondutypassCount});
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

app.post('/AdvisorVerifyOnduty', async (req, res) => {
    try {
        const {rejected_btn, Approv_btn, S_Id,status } = req.body;
        if (Approv_btn==="accept" && S_Id && status==="advisor") {
            const student = await Database.findById(S_Id);
            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }
           student.status="hod";
           await student.save();
           console.log("st",status);
        }
        if (rejected_btn==="reject" && S_Id) {
            const deleteResult = await Database.deleteOne({ _id: S_Id });
            console.log('Delete Result:', deleteResult); 
        }
    

        res.redirect('/AdvisorVerifyOnduty');
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ message: 'Error processing request', error: error.message });
    }
});
//staffverify section
app.get('/StaffVerify',ensureLoggedInHod, async (req, res) => {
    try {
        const search = req.query.search_input; // Get the search input (department or part of it)
        const validDepartments = ['cse', 'csbs', 'aids', 'mech', 'aero', 'agri', 'eee', 'ece', 'bme', 'biotech', 'aiml', 'mca'];
        let students;
        if (search && validDepartments.includes(dept)) {
            students = await Database.find({
                $or: [
                    { register_number:{ $regex: search, $options: 'i' } },
                    { department: { $regex: search, $options: 'i' }},
                    {student_name: { $regex: search, $options: 'i' }},
                    {purpose_of_outpass:{ $regex: search, $options: 'i' }},
                    {year:{ $regex: search, $options: 'i' }},
                    {parent_conduct_number:{ $regex: search, $options: 'i' }}
                ],
                department: dept.toUpperCase(),
                status: 'hod',
                type: 'homepass'
            }).exec();
        } else {
            students = await Database.find({
                department: dept.toUpperCase(),
                status: 'hod',
                type: 'homepass'
            }).exec();
        }
        let homepassCount=0,outpassCount=0,ondutypassCount=0;
        try{
        homepassCount = await Database.countDocuments({type: 'homepass',department: dept.toUpperCase(),status:'hod',});
        outpassCount = await Database.countDocuments({type: 'outpass',department: dept.toUpperCase(),status:'hod',});
        ondutypassCount = await Database.countDocuments({type: 'onduty',department: dept.toUpperCase(),status:'hod', });
        }
        catch{
            console.log("Error counting database");
        }
        res.render('StaffVerify', { students: students,homepassCount :homepassCount,outpassCount:outpassCount,ondutypassCount:ondutypassCount});
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});


app.post('/StaffVerify', async (req, res) => {
    try {
        
        const {rejected_btn, Approv_btn, S_Id,status } = req.body;
        console.log("Req",req.body);
        if (Approv_btn==="accept" && S_Id && status==="hod") {
            const student = await Database.findById(S_Id);
            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }
           student.status="principal";
           await student.save();
        }
        if (rejected_btn==="reject" && S_Id) {
            const deleteResult = await Database.deleteOne({ _id: S_Id });
            console.log('Delete Result:', deleteResult); 
        }
    

        res.redirect('/StaffVerify');
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ message: 'Error processing request', error: error.message });
    }
});
app.get('/StaffVerifyOutpass',ensureLoggedInHod, async (req, res) => {
    try {
        const search = req.query.search_input; 
        const validDepartments = ['cse', 'csbs', 'aids', 'mech', 'aero', 'agri', 'eee', 'ece', 'bme', 'biotech', 'aiml', 'mca'];
        let students;
    
        if (search &&  validDepartments.includes(dept)) {
            students = await Database.find({ department: dept.toUpperCase(),
                $or: [
                    { register_number:{ $regex: search, $options: 'i' } },
                    { department: { $regex: search, $options: 'i' }},
                    {student_name: { $regex: search, $options: 'i' }},
                    {purpose_of_outpass:{ $regex: search, $options: 'i' }},
                    {year:{ $regex: search, $options: 'i' }},
                    {parent_conduct_number:{ $regex: search, $options: 'i' }}
                ],
                 status: 'hod', type: 'outpass' }).exec();
        } else {
            students = await Database.find({department: dept.toUpperCase(), status: 'hod', type: 'outpass' }).exec();
        }
        let homepassCount=0,outpassCount=0,ondutypassCount=0;
        try{
        homepassCount = await Database.countDocuments({type: 'homepass',department: dept.toUpperCase(),status:'hod',});
        outpassCount = await Database.countDocuments({type: 'outpass',department: dept.toUpperCase(),status:'hod',});
        ondutypassCount = await Database.countDocuments({type: 'onduty',department: dept.toUpperCase(),status:'hod', });
        }
        catch{
            console.log("Error counting database");
        }
        res.render('StaffVerifyOutpass', { students: students,homepassCount :homepassCount,outpassCount:outpassCount,ondutypassCount:ondutypassCount});
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});

app.post('/StaffVerifyOutpass', async (req, res) => {
    try {
        
        const {rejected_btn, Approv_btn, S_Id,status } = req.body;
        console.log("Req",req.body);
        if (Approv_btn==="accept" && S_Id && status==="hod") {
            const student = await Database.findById(S_Id);
            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }
           student.status="principal";
           await student.save();
           console.log("st",status);
        }
        if (rejected_btn==="reject" && S_Id) {
            const deleteResult = await Database.deleteOne({ _id: S_Id });
            console.log('Delete Result:', deleteResult); 
        }
    

        res.redirect('/StaffVerifyOutpass');
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ message: 'Error processing request', error: error.message });
    }
});
app.get('/StaffVerifyOnduty',ensureLoggedInHod, async (req, res) => {
    try {
        const search = req.query.search_input; 
        const validDepartments = ['cse', 'csbs', 'aids', 'mech', 'aero', 'agri', 'eee', 'ece', 'bme', 'biotech', 'aiml', 'mca'];
        let students;
    
        if (search &&  validDepartments.includes(dept)) {
            students = await Database.find({ department: dept.toUpperCase(),
                $or: [
                    { register_number:{ $regex: search, $options: 'i' } },
                    { department: { $regex: search, $options: 'i' }},
                    {student_name: { $regex: search, $options: 'i' }},
                    {purpose_of_outpass:{ $regex: search, $options: 'i' }},
                    {year:{ $regex: search, $options: 'i' }},
                    {parent_conduct_number:{ $regex: search, $options: 'i' }}
                ],
                 status: 'hod', type: 'onduty' }).exec();
        } else {
            students = await Database.find({ department: dept.toUpperCase(),status: 'hod', type: 'onduty' }).exec();
        }
        let homepassCount=0,outpassCount=0,ondutypassCount=0;
        try{
        homepassCount = await Database.countDocuments({type: 'homepass',department: dept.toUpperCase(),status:'hod',});
        outpassCount = await Database.countDocuments({type: 'outpass',department: dept.toUpperCase(),status:'hod',});
        ondutypassCount = await Database.countDocuments({type: 'onduty',department: dept.toUpperCase(),status:'hod', });
        }
        catch{
            console.log("Error counting database");
        }
        res.render('StaffVerifyOnduty', { students: students,homepassCount :homepassCount,outpassCount:outpassCount,ondutypassCount:ondutypassCount});
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});
app.post('/StaffVerifyOnduty', async (req, res) => {
    try {
        
        const {rejected_btn, Approv_btn, S_Id,status } = req.body;
        console.log("Req",req.body);
        if (Approv_btn==="accept" && S_Id && status==="hod") {
            const student = await Database.findById(S_Id);
            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }
           student.status="principal";
           await student.save();
           console.log("st",status);
        }
        if (rejected_btn==="reject" && S_Id) {
            const deleteResult = await Database.deleteOne({ _id: S_Id });
            console.log('Delete Result:', deleteResult); 
        }
    

        res.redirect('/StaffVerifyOnduty');
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ message: 'Error processing request', error: error.message });
    }
});
//PrincipalVerify
app.get('/PrincipalVerify',ensureLoggedInPrincipal, async(req, res) => {
    try{
        const search = req.query.search_input;
        let students;
        if(search)
        {
        students=await Database.find({ 
            $or: [
                { register_number:{ $regex: search, $options: 'i' } },
                { department: { $regex: search, $options: 'i' }},
                {student_name: { $regex: search, $options: 'i' }},
                {purpose_of_outpass:{ $regex: search, $options: 'i' }},
                {year:{ $regex: search, $options: 'i' }},
                {parent_conduct_number:{ $regex: search, $options: 'i' }}
            ],
            status: "principal" ,type:"homepass"}).exec(); 
        }
        else{
students=await Database.find({  status: "principal" ,type:"homepass"}).exec(); 
            }
            let homepassCount=0,outpassCount=0,ondutypassCount=0;
            try{
            homepassCount = await Database.countDocuments({type: 'homepass',status:'principal',});
            outpassCount = await Database.countDocuments({type: 'outpass',status:'principal',});
            ondutypassCount = await Database.countDocuments({type: 'onduty',status:'principal', });
            }
            catch{
                console.log("Error counting database");
            }
            res.render('PrincipalVerify', { students: students,homepassCount :homepassCount,outpassCount:outpassCount,ondutypassCount:ondutypassCount});
    }catch(err)
    {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});
app.post('/PrincipalVerify', async (req, res) => {
    try {
        const { rejected_btn, Approv_btn, S_Id, status } = req.body;

        if (Approv_btn === "accept" && S_Id && status === "principal") {
            const student = await Database.findById(S_Id);
            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }

            console.log(student.type,"***************************");
            student.status = "Approved";
            await student.save();

            const final = new ToDatabase({
                student_name: student.student_name,
                register_number: student.register_number,
                department: student.department,
                year: student.year,
                purpose_of_outpass: student.purpose_of_outpass,
                parent_conduct_number: student.parent_conduct_number,
                from_date: student.from_date,
                to_date: student.to_date,
                status: student.status,
                type:student.type
            });
            await final.save();
        }
        if (rejected_btn === "reject" && S_Id) {
            const deleteResult = await Database.deleteOne({ _id: S_Id });
            console.log('Delete Result:', deleteResult);

            res.redirect('/PrincipalVerify');
            return; 
        }

        res.redirect('/PrincipalVerify');
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ message: 'Error processing request', error: error.message });
    }
});
app.get('/PrincipalVerifyOutpass',ensureLoggedInPrincipal, async(req, res) => {
    try{
        const search = req.query.search_input;
        let students;
        if(search)
        {
        students=await Database.find({
            $or: [
                { register_number:{ $regex: search, $options: 'i' } },
                { department: { $regex: search, $options: 'i' }},
                {student_name: { $regex: search, $options: 'i' }},
                {purpose_of_outpass:{ $regex: search, $options: 'i' }},
                {year:{ $regex: search, $options: 'i' }},
                {parent_conduct_number:{ $regex: search, $options: 'i' }}],
                 status: "principal" ,type:"outpass"}).exec(); 
        }
        else
        {
            students=await Database.find({  status: "principal" ,type:"outpass"}).exec(); 
        }
        let homepassCount=0,outpassCount=0,ondutypassCount=0;
            try{
            homepassCount = await Database.countDocuments({type: 'homepass',status:'principal',});
            outpassCount = await Database.countDocuments({type: 'outpass',status:'principal',});
            ondutypassCount = await Database.countDocuments({type: 'onduty',status:'principal', });
            }
            catch{
                console.log("Error counting database");
            }
            res.render('PrincipalVerifyOutpass', { students: students,homepassCount :homepassCount,outpassCount:outpassCount,ondutypassCount:ondutypassCount});
    }catch(err)
    {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});
app.post('/PrincipalVerifyOutpass', async (req, res) => {
    try {
        const {rejected_btn, Approv_btn, S_Id,status } = req.body;
        if (Approv_btn==="accept" && S_Id && status==="principal") {
            const student = await Database.findById(S_Id);
            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }
           student.status="Approved";
           await student.save();

           const final = new ToDatabase({
            student_name: student.student_name,
            register_number: student.register_number,
            department: student.department,
            year: student.year,
            purpose_of_outpass: student.purpose_of_outpass,
            parent_conduct_number: student.parent_conduct_number,
            from_date: student.from_date,
            to_date: student.to_date,
            status: student.status,
            type:student.type
        });
        await final.save();
           console.log("st",status);
        }
        if (rejected_btn==="reject" && S_Id) {
            const deleteResult = await Database.deleteOne({ _id: S_Id });
            console.log('Delete Result:', deleteResult); 
        }
    

        res.redirect('/PrincipalVerifyOutpass');
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ message: 'Error processing request', error: error.message });
    }
});

app.get('/PrincipalVerifyOnduty', ensureLoggedInPrincipal,async(req, res) => {
    try{
        const search = req.query.search_input;
        let students;
        if(search)
        {
         students=await Database.find({ 
            $or: [
                { register_number:{ $regex: search, $options: 'i' } },
                { department: { $regex: search, $options: 'i' }},
                {student_name: { $regex: search, $options: 'i' }},
                {purpose_of_outpass:{ $regex: search, $options: 'i' }},
                {year:{ $regex: search, $options: 'i' }},
                {parent_conduct_number:{ $regex: search, $options: 'i' }}
            ],
            status: "principal" ,type:"onduty"}).exec(); 
        }
            else{
                students=await Database.find({  status: "principal" ,type:"onduty"}).exec(); 
            }
            let homepassCount=0,outpassCount=0,ondutypassCount=0;
            try{
            homepassCount = await Database.countDocuments({type: 'homepass',status:'principal',});
            outpassCount = await Database.countDocuments({type: 'outpass',status:'principal',});
            ondutypassCount = await Database.countDocuments({type: 'onduty',status:'principal', });
            }
            catch{
                console.log("Error counting database");
            }
            res.render('PrincipalVerifyOnduty', { students: students,homepassCount :homepassCount,outpassCount:outpassCount,ondutypassCount:ondutypassCount});
        
    }catch(err)
    {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});
app.post('/PrincipalVerifyOnduty', async (req, res) => {
    try {
        const {rejected_btn, Approv_btn, S_Id,status } = req.body;
        if (Approv_btn==="accept" && S_Id && status==="principal") {
            const student = await Database.findById(S_Id);
            if (!student) {
                return res.status(404).json({ message: 'Student not found' });
            }
           student.status="security";
           await student.save();
           const final = new ToDatabase({
            student_name: student.student_name,
            register_number: student.register_number,
            department: student.department,
            year: student.year,
            purpose_of_outpass: student.purpose_of_outpass,
            parent_conduct_number: student.parent_conduct_number,
            from_date: student.from_date,
            to_date: student.to_date,
            status: student.status,
            type:student.type
        });
        await final.save();
           console.log("st",status);
        }
        if (rejected_btn==="reject" && S_Id) {
            const deleteResult = await Database.deleteOne({ _id: S_Id });
            console.log('Delete Result:', deleteResult); 
        }
    

     res.redirect('/PrincipalVerifyOnduty');
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ message: 'Error processing request', error: error.message });
    }
});

//Admin
app.get('/AdminPage', async (req, res) => {
    try {
        res.redirect('/LoginRegister');
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});


//StatusCheck
app.post('/Status', async (req, res) => {
    try {
        const { register_number } = req.body;

        // First Database Check
        let hodRecord = await Database.findOne({ register_number });
        if (hodRecord) {
            const { type, status } = hodRecord;
            if (type === 'homepass'|| type === 'outpass' || type === 'onduty') {
                return res.json({ status: status.toUpperCase() ,type:type.toUpperCase()});
            }
        }
        res.status(404).json({ message: "Record not found" });
    } catch (error) {
        console.error("Error checking database:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

let register = ""; 

app.post('/History', async (req, res) => {
    try {
        
        const { register_number } = req.body;
        register = register_number; 
        res.sendStatus(200);
    } catch (error) {
        console.error("Error storing history:", error);
        res.status(500).json({ message: "Error storing history", error: error.message });
    }
});

app.get('/History', async (req, res) => {
    try {
        const search = req.query.search_input;
        let requests;
        if(search)
        {
            requests = await ToDatabase.find({  $or: [
                { register_number:{ $regex: search, $options: 'i' } },
                { department: { $regex: search, $options: 'i' }},
                {student_name: { $regex: search, $options: 'i' }},
                {purpose_of_outpass:{ $regex: search, $options: 'i' }},
                {year:{ $regex: search, $options: 'i' }},
                {parent_conduct_number:{ $regex: search, $options: 'i' }},
                {type:{ $regex: search, $options: 'i' }}],
                register_number: register }).exec();
        }
        else{
     requests = await ToDatabase.find({ register_number: register }).exec();
        }
        res.render('StudentHistory', { database: requests });
    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
});
// Route to render the feedbacks
app.get('/Feedback',ensureLoggedInAdmin, async (req, res) => {
    try {
        // Fetch all feedbacks from the database
        const feedbacks = await Feedback.find();

        // Render the Feedbacks page with the data
        res.render('Feedbacks', { feedbacks: feedbacks });
    } catch (error) {
        console.error("Error fetching feedbacks:", error);
        res.status(500).json({ message: "Error fetching feedbacks" });
    }
});
app.post('/Feedback', async (req, res) => {
    try {
        const {fb_name, fb_email, fb_message } = req.body;

        if (!fb_email || !fb_message || !fb_name) {
            return res.status(400).json({ success: false, message: "Email and message are required." });
        }

        console.log('Feedback data:', { fb_name, fb_email, fb_message });

        // Save feedback
        const feedback = new Feedback({
            fb_name: fb_name,
            fb_email: fb_email,
            fb_message: fb_message,
        });

        await feedback.save();
        return res.redirect('/');

        // return res.json({ success: true, message: "Feedback submitted successfully." });
    } catch (error) {
        console.error("Error saving feedback:", error);
        return res.status(500).json({ success: false, message: "Error saving feedback", error: error.message });
    }
});
app.post('/deleteFeedback', async (req, res) => {
    try {
        const feedbackId = req.body.id;
        // Use async/await with deleteOne()
        await Feedback.deleteOne({ _id: feedbackId });
        res.redirect('/feedback'); // Redirect to the feedbacks page after deletion
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting feedback.');
    }
});
app.get('/History/DownloadQR/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const passDetails = await ToDatabase.findById(id).exec();

        if (!passDetails) {
            return res.status(404).send("Pass not found");
        }

        // QR Code Data
        const qrData = {
            student_name: passDetails.student_name,
            register_number: passDetails.register_number,
            department: passDetails.department,
            year: passDetails.year,
            purpose_of_outpass: passDetails.purpose_of_outpass,
            parent_conduct_number: passDetails.parent_conduct_number,
            from_date: passDetails.from_date,
            to_date: passDetails.to_date,
            status: passDetails.status
        };

        // Generate QR Code using the qrcode library
        const qrCodeImage = await QRCode.toDataURL(JSON.stringify(qrData), { width: 300 });

        // Create a PDF document to include the pass details and QR Code
        const doc = new PDFDocument();

        // Set response headers to serve PDF in the browser
        res.contentType("application/pdf");
        res.setHeader('Content-Disposition', 'inline; filename=pass_details.pdf'); // Open in browser, not download

        doc.pipe(res); // Directly pipe the PDF to the response stream
        doc.fontSize(15).text('KIT-KALAIGNARKARUNANIDHI INSTITUTE OF TECHNOLOGY', { align: 'center' }).moveDown(2); 
        // Add Title
        doc.fontSize(15).text(`${passDetails.type} QR Code`, { align: 'center' }).moveDown(1);  // Title, centered


        // Add Pass Details (Add more padding and structure)
        doc.fontSize(12)
            .text(`Name: ${passDetails.student_name}`)
            .moveDown(0.5)
            .text(`Roll No: ${passDetails.register_number}`)
            .moveDown(0.5)
            .text(`Department: ${passDetails.department}`)
            .moveDown(0.5)
            .text(`Year: ${passDetails.year}`)
            .moveDown(0.5)
            .text(`Purpose of Outpass: ${passDetails.purpose_of_outpass}`)
            .moveDown(0.5)
            .text(`Parent Contact: ${passDetails.parent_conduct_number}`)
            .moveDown(0.5)
            .text(`Valid From: ${passDetails.from_date}`)
            .moveDown(0.5)
            .text(`Valid To: ${passDetails.to_date}`)
            .moveDown(0.5)
            .text(`Status: ${passDetails.status}`)
            .moveDown(3);  // Adds some space before QR code
        
        // Add QR Code Image (Centering QR and adding padding)
        doc.image(qrCodeImage, {
            width: 200,
            height: 200,
            align: 'center',
            valign: 'center',
        }).moveDown(20);
        
        // Optional: Add a footer
        doc.fontSize(10).text("Generated by College Outpass System", {
            align: 'center',
            opacity: 0.6
        }).moveDown(1);
        
        // Finalize the document and send the PDF as response
        doc.end();

    } catch (err) {
        console.error("Error generating QR code and PDF:", err);
        res.status(500).send("Internal Server Error");
    }
});







// xerox field

app.get('/Admin',async (req, res) => {
    try {
        const requests=await Admin.find();
        res.render('xeroxAdmin',{requests:requests});
    } catch (error) {
        res.status(500).send({ message: "Failed to fetch data", error });
    }
});
app.get('/AdminShops',async (req, res) => {
    try {
        const shops=await earnings.find();
        res.render('AdminShop',{shops:shops});
    } catch (error) {
        res.status(500).send({ message: "Failed to fetch data", error });
    }
});

app.delete('/Admin/delete/:id', async (req, res) => {
    try {
        const requestId = req.params.id;
        await Admin.findByIdAndDelete(requestId);
        res.status(200).send({ message: "Request deleted successfully" });
    } catch (error) {
        res.status(500).send({ message: "Failed to delete request", error });
    }
});


app.get('/xeroxHome', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'html-xerox-home.html'));
});

app.get('/owner-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'html-xerox-login.html'));
});
app.post('/owner-login', async (req, res) => {
    try {
        const { shopId } = req.body;
        const owner = await shopOwner.findOne({ shopId: shopId });
        console.log(shopId);

        if (!owner) {
            return res.status(404).send({ message: "Shop ID not found" });
        }

        req.session.owner = owner._id;
        res.redirect('owner-Dashboard'); 
    } catch (error) {
        res.status(500).send({ message: "Login failed", error });
    }
});


app.get('/owner-Dashboard', async (req, res) => {
    const shopId = req.session.owner;

    // Redirect to login if shopId is not found in session
    if (!shopId) {
        return res.redirect('/owner-login');
    }

    try {
        // Fetch orders with "paid" payment status for the specific shopId
        const orders = await xeroxRequests.find({ shopId: shopId, paymentStatus: "paid" });
        console.log(shopId);
        // Fetch earnings data for the specific shopId
        const amount = await earnings.findOne({ shopId: shopId });

        // If earnings not found, default to 0
        const totalAmount = amount ? amount.totalEarns : 0;
        const weekAmount = amount ? amount.weekEarnings : 0;

        // Render orders page with the fetched data
        res.render('Orders_requests', { orders, total: totalAmount,week:weekAmount ,shopId:shopId});
    } catch (error) {
        // Log the error for debugging
        console.error("Error fetching orders or earnings: ", error);

        // Send a response with the error message
        res.status(500).send({ message: "Failed to fetch orders", error: error.message });
    }
});


app.post('/clear/:id', async (req, res) => {
    try {
        const shopId = req.params.id;
        console.log(shopId);
        const earningsData = await earnings.findOne({ shopId: shopId });

        if (!earningsData) {
            return res.status(404).send({ error: 'Earnings data not found for this shop.' });
        }

        earningsData.totalEarns += earningsData.weekEarnings;
        earningsData.weekEarnings = 0;
        await earningsData.save();

        res.redirect('/Adminshops');
    } catch (error) {
        console.error('Failed to clear the data:', error);
    }
});










app.get('/shop-register', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'html-shop-register.html'));
});
app.post('/shop-register', async (req, res) => {
    try {
        const {
            fullName, gender, phonePrimary, phoneAlternate, email, shopName, shopAddress, freeDelivery, deliveryCharge, deliveryDays, blackWhiteA4, blackWhiteA3, colorA4, colorA3, spiralBinding, 
            hardCoverBinding,  softCoverBinding, lamination, scanning, posters, businessCards
        } = req.body;
        if (!email || email.trim() === '') {
            return res.status(400).json({ message: 'Email is required' });
        }

        const existingShop = await shopOwner.findOne({ email });
        if (existingShop) {
            return res.status(400).json({ message: 'Shop with this email already exists' });
        }

        if (!fullName || !phonePrimary || !shopName || !shopAddress || !email) {
            return res.status(400).json({ message: 'All required fields must be filled out' });
        }

        const shopId = crypto.randomInt(1000000, 9999999).toString();
        req.session.shopId = shopId;
        console.log(shopId);
        const newShop = new shopOwner({
            fullName, 
            gender, 
            phonePrimary, 
            phoneAlternate, 
            email, 
            shopName, 
            shopAddress, 
            freeDelivery, 
            deliveryCharge, 
            deliveryDays, 
            blackWhiteA4,
            blackWhiteA3,
            colorA4,
            colorA3,
            spiralBinding,
            hardCoverBinding,
            softCoverBinding,
            lamination,
            scanning,
            posters,
            businessCards,
            shopId  
        });
        await newShop.save();
        return res.redirect('/shop-id');
        
    } catch (error) {
        console.error("Error in shop registration:", error);
        res.status(500).json({ message: 'An unexpected error occurred. Please try again later.' });
    }
});
app.get('/shop-id', (req, res) => {
        console.log(req.session.shopId);
        res.render('shopId',{shopId:req.session.shopId});
    });

    
    
















app.get('/PersonalDetails', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'html-xerox-page1.html'));
});




app.post('/PersonalDetails', async (req, res) => {
    const { firstName, lastName, email, phone } = req.body;
    try {
        req.session.identity = uuidv4();
        const personal = new xeroxRequests({
            identity:req.session.identity,
            firstName,
            lastName,
            email,
            phone,
        });
        await personal.save();
        await res.redirect("/DocumentInfo");
    } catch (error) {
        res.status(500).send({ error: 'Failed to save personal details.' });
    }
});



app.get('/historycheck', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'html-xeroxhistory.html'));
});

app.get('/DocumentInfo', async (req, res) => {
    try {
        const shops = await shopOwner.find({}, 'shopName'); // Fetch only shop names
        res.render('html-xerox-document', { shops: shops });
    } catch (error) {
        res.status(500).send({ message: "Error fetching shop information", error });
    }
});




app.post('/DocumentInfo', async (req, res) => {
    const { docTitle, numPages, numCopies, paperSize, printType, bindingOption, uploadDocument,totalamount,shopId } = req.body;
    console.log("doc"+ docTitle, numPages, numCopies, paperSize, printType, bindingOption, uploadDocument,totalamount );
    const identity = req.session.identity;
    try {
        await xeroxRequests.findOneAndUpdate(
            { identity:identity },
            {
                $set: {
                    docTitle,
                    numPages,
                    numCopies,
                    paperSize,
                    printType,
                    bindingOption,
                    uploadDocument,
                    shopId,
                    totalamount
                }
            },
            { new: true } // returns the updated document
        );
        await res.redirect('/Payment');
    } catch (error) {
        res.status(500).send({ error: 'Do not worry, go back ,Refresh the page and try again 😇.' });
    }
});





app.get('/getShopDetails/:shopId', async (req, res) => {
    try {
        const shop = await shopOwner.findById(req.params.shopId);
        if (shop) {
            res.json(shop);
        } else {
            res.status(404).json({ message: "Shop not found" });
        }
    } catch (error) {
        res.status(500).json({ message: "Error fetching shop details", error });
    }
});



app.get('/Payment', async (req, res) => {
    try {
        const identity = req.session.identity;
        const tot = await xeroxRequests.findOne({ identity: identity });
        if (!tot) {
            return res.status(404).send("Time limit exceeded, do it from scratch");
        }
        console.log(tot.totalamount);
        const totalamount = tot.totalamount;
        res.render('html-xerox-payment', { totalamount: totalamount });
    } catch (error) {
        console.log("Error in finding totalamount:", error);
        res.status(500).send("An error occurred while retrieving payment details");
    }
});

app.post('/Payment', async (req, res) => {
    const { instruction,paymentStatus } = req.body;
    console.log("pay=",instruction,"status=",paymentStatus);
    const identity = req.session.identity;
    try {
        await xeroxRequests.findOneAndUpdate(
            { identity:identity },
            {
                $set: {
                    instruction,
                    paymentStatus
                }
            },
            { new: true }
        );
        res.redirect('/');
    } catch (error) {
        res.status(500).send({ error: 'Failed to update payment details.' });
    }
});




app.post('/update-order/:id', async (req, res) => {
    const orderId = req.params.id;
    console.log("update order id",orderId);
    const { remarks, completed, delivered } = req.body;
    console.log(remarks, completed, delivered );
    try {
        await xeroxRequests.findOneAndUpdate(
            { _id: orderId },
            {
                $set: {
                    remarks,  
                    completed,
                    delivered
                }
            },
            { new: true }
        );
        res.redirect('/owner-Dashboard');
    } catch (error) {
        res.status(500).send({ error: 'Failed to update order details.' });
    }
});



app.post('/send-order/:id', async (req, res) => {
    try {
        const orderId = req.params.id;
        const complete = await xeroxRequests.findById(orderId);

        if (!complete) {
            return res.status(404).send({ message: "Request not found" });
        }

        const { identity, firstName, lastName, email, phone, docTitle, numPages, numCopies, paperSize, printType, bindingOption, uploadDocument, shopId, totalamount, instruction, paymentStatus, remarks, completed, delivered, reason } = complete;
        const admindatabase = new Admin({
            identity, firstName, lastName, email, phone, docTitle, numPages, numCopies, paperSize, printType, bindingOption, uploadDocument, shopId, totalamount, instruction, paymentStatus, remarks, completed, delivered, reason
        });
        await admindatabase.save();
        const shop=await shopOwner.findOne({_id:complete.shopId});

        let amount = await earnings.findOne({ shopId: complete.shopId });
        if (!amount) {
            amount = new earnings({
                shopName:shop.shopName,
                shopId: complete.shopId,
                totalEarns: 0,
                weekEarnings:0
            });
            await amount.save();
        }
        amount.weekEarnings += complete.totalamount;
        await amount.save();
        await xeroxRequests.findByIdAndDelete(orderId);
        res.redirect('/owner-Dashboard');
    } catch (error) {
        console.error("Error processing the order: ", error);
        res.status(500).send({ message: "Failed to process request", error: error.message });
    }
});






app.get('/xeroxHistory', async (req, res) => {
    try {
    
        const { historyPhoneNumber } = req.query;

        console.log(historyPhoneNumber);
        const xerox = await xeroxRequests.find({ phone: historyPhoneNumber ,paymentStatus:"paid"});
        res.render('XeroxHistory', { xerox });

    } catch (error) {
        console.error("Error retrieving history:", error);
        res.status(500).json({ message: "Error retrieving history", error: error.message });
    }
});





//payment gateway

const razorpay = require('razorpay');
const instance = new razorpay({
  key_id: process.env.RAZER_KEY_ID,
  key_secret: process.env.RAZER_SECRET_ID
});

app.post('/create-order', (req, res) => {
  const { amount } = req.body;
  
console.log("amount=",amount)
  const options = {
    amount: Number(amount), // Amount in paise
    currency: 'INR',
    receipt: 'receipt#1',
  };

  instance.orders.create(options, function(err, order) {
    if (err) {
      console.error('Error creating order:', err);
      return res.status(500).json({ error: 'Error creating order' });
    }

    // Send the order ID to the frontend
    res.json({ order_id: order.id });
  });
});











//port
const PORT = process.env.PORT;
app.listen(PORT)