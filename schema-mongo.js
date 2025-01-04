const mongoose = require('mongoose');

const Student_Accounts = new mongoose.Schema({
    image_R:String,
    first_name_R:String,
    last_name_R: String,
    email_id_R: String,
    create_password_R: String,
    register_number_R:String,
    phone_number_R:String,
    department_R:String,
    year_R:String,
    address_R:String
});
const HOD_DB = new mongoose.Schema({
    student_name: {
        type: String,
        required: true
    },
    register_number: String,
    department: String,
    year: String,
    purpose_of_outpass: String,
    parent_conduct_number: String,
    address:String,
    from_date: String,
    to_date: String,
    status:String,
    type:String,
    image:String
});
const Database1= new mongoose.Schema({
    student_name: String,
    register_number: String,
    department: String,
    year: String,
    purpose_of_outpass: String,
    parent_conduct_number: String,
    from_date: String,
    to_date: String,
    type:String
});

const Feedbacks=new mongoose.Schema({
    fb_name:String,
    fb_email:String,
    fb_message:String
});
const Account = mongoose.model("Account", Student_Accounts);
const Database = mongoose.model("Student", HOD_DB);
const ToDatabase = mongoose.model("ToDatabase", Database1);
const Feedback = mongoose.model("Feedback", Feedbacks);














module.exports = { Account,Database,ToDatabase,Feedback};