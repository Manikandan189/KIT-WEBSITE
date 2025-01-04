const mongoose=require('mongoose')
const express=require('express')
const fs = require('fs');
const QRCode = require('qrcode');
const bodyParser=require('body-parser')
const path=require('path')
const PDFDocument = require('pdfkit');
const session = require('express-session');
const {Account,Database,ToDatabase,Feedback}=require('./schema-mongo');
require('dotenv').config({path: './ImportantLinks.env'});
const { MongoClient, ServerApiVersion } = require('mongodb');


const app=express()
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('css'));
app.use(express.static('js'));
app.use(express.static('img'));



const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  
  async function run() {
    try {
      await client.connect();  // Connects to MongoDB
      await client.db("admin").command({ ping: 1 });  // Sends a ping command to confirm successful connection
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      await client.close();  // Ensures that the client is closed after the operation
    }
  }
  run().catch(console.dir);
  



app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }    
}));



// app.get('/Form', async (req, res) => {
//     try {
//         const student=await Database.find({ status: "principal" ,type:"outpass"}).exec(); 
//         res.render('FinalForm', {student});
//     } catch (err) {
//         res.status(500).send(err);
//     }
// });



// const qrDir = path.join(__dirname, 'qr_codes');
// if (!fs.existsSync(qrDir)) {
//     fs.mkdirSync(qrDir);
// }






app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'html','html-home.html'));
});
app.get('/Departments', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'html-departments.html'));
});


app.get('/Admin_options', (req, res) => {
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
app.get('/Accounts', async (req, res) => {
    try {
        // Fetch all accounts from the database
        const Acc = await Account.find();
        
        // Render the 'Accounts' template and pass the data
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

        // Update account details
        await Account.findByIdAndUpdate(req.params.id, {
            first_name_R,
            last_name_R,
            email_id_R,
            phone_number_R,
            department_R,
            create_password_R
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
        account.create_password_R = F_newpass;
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
        
        // Check for password match
        if (create_password_R !== re_password_R) {
            return res.status(400).json({ message: "Passwords do not match" });
        }
        // Check if user already exists
        const existingUser = await Account.findOne({ email_id_R });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        
        
        // Create new user
        const newUser = new Account({
            image_R,
            first_name_R,
            last_name_R,
            email_id_R,
            create_password_R, 
            register_number_R,
            phone_number_R,
            department_R,
            year_R,
            address_R,

        });
      

        // Save new user
        await newUser.save();
        res.redirect('/StudentLogin');

    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ message: "Error registering user", error: error.message });
    }
});












//StudentLogin
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
        if (student_password!==user.create_password_R) {
            return res.redirect('/StudentLogin')
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
        };2
        
            res.redirect('/Register')
        
                   // console.log(student.status);
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
        if(advisor_email==="advisor@gmail.com" && advisor_password==="12345")
        res.redirect('/AdvisorVerify')
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
        if(staff_email==="rajamohamad@gmail.com" && staff_password==="raja")
        res.redirect('/StaffVerify')
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
        if(principal_email==="principal@gmail.com" && principal_password==="1970")
        res.redirect('/PrincipalVerify')
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
        if(security_email==="admin@gmail.com" && security_password==="2660")
        res.redirect('/Admin_options')
    }
    catch(error){
        res.redirect('/AdminLogin')
    }

})


//login page and login register page completed above











app.get('/Who', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'html-who.html'));
});







//OutpassRegister:
// Render the registration form page
app.get('/Register', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/StudentLogin');
    }
    res.render('html-register', { user: req.session.user });
});



app.get('/OutpassRegister', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/StudentLogin');
    }
    res.render('OutpassRegister', { user: req.session.user });
});



app.get('/OndutyRegister', (req, res) => {
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

        // Check if a record with the same register number and type 'homepass' exists
        const existingRecord = await Database.findOne({
            register_number: registerNumber_S,
            parent_conduct_number: phoneNumber_S
        });
        

        if (existingRecord) {
            console.log("Existing record found, deleting...");
            await Database.deleteOne({ register_number: registerNumber_S ,parent_conduct_number: phoneNumber_S});
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
            status: "advisor", // Initial status
            type: type,        // Type of pass
            image: image_S,    // Student image
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



app.get('/AdvisorVerify', async (req, res) => {
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
    
        res.render('AdvisorVerify', { students: students });
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
           console.log(student.parent_conduct_number);
           const studentPhoneNumber =student.parent_conduct_number;
console.log(studentPhoneNumber);
const studentName = student.student_name;

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










app.get('/AdvisorVerifyOutpass', async (req, res) => {
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
    
        res.render('AdvisorVerifyOutpass', { students: students });
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






app.get('/AdvisorVerifyOnduty', async (req, res) => {
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
    

        res.render('AdvisorVerifyOnduty', { students: students });
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
app.get('/StaffVerify', async (req, res) => {
    try {
        const search = req.query.search_input; // Get the search input (department or part of it)
        const validDepartments = ['cse', 'csbs', 'aids', 'mech', 'aero', 'agri', 'eee', 'ece', 'bme', 'biotech', 'aiml', 'mca'];
        let students;
        if (search && validDepartments.includes(dept)) {
            // If search term matches a valid department, filter by department
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
            // If no input is provided, fetch all homepass students
            students = await Database.find({
                department: dept.toUpperCase(),
                status: 'hod',
                type: 'homepass'
            }).exec();
        }
        // If it's an AJAX request, return JSON data
        // if (req.xhr) {
        //     return res.json(students);
        // }

        // If it's a regular request (non-AJAX), render the page with students
        res.render('StaffVerify', { students: students });
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
           console.log("st",status);
           console.log(student.parent_conduct_number);
           const studentPhoneNumber = +91+student.parent_conduct_number;
           const studentName = student.student_name;
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






app.get('/StaffVerifyOutpass', async (req, res) => {
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
    

        res.render('StaffVerifyOutpass', { students: students });
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







app.get('/StaffVerifyOnduty', async (req, res) => {
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
    

        res.render('StaffVerifyOnduty', { students: students });
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
app.get('/PrincipalVerify', async(req, res) => {
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
        
    res.render('PrincipalVerify', {students});
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
            const studentPhoneNumber = "+91" + student.parent_conduct_number;
            const studentName = student.student_name;


        }
        if (rejected_btn === "reject" && S_Id) {
            const student = await Database.findById(S_Id);

            
            const studentPhoneNumber = "+91" + student.parent_conduct_number;
            const studentName = student.student_name;

            
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






app.get('/PrincipalVerifyOutpass', async(req, res) => {
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
        res.render('PrincipalVerifyOutpass', {students});
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





app.get('/PrincipalVerifyOnduty', async(req, res) => {
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
    res.render('PrincipalVerifyOnduty', {students});
        
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





//taffVerify
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
            if (type === "homepass" || type === "outpass" || type === "onduty") {
                return res.json({ message: status });
            }
        }

        // Second Database Check
        hodRecord = await ToDatabase.findOne({ register_number });
        if (hodRecord) {
            const { type, status } = hodRecord;
            if (type === "homepass") {
                return res.json({ message: status });
            }
        }

        // If no record found
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
app.get('/Feedback', async (req, res) => {
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
//port
const PORT = process.env.PORT || 5100;
app.listen(PORT)