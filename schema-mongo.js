const mongoose = require('mongoose');

const Student_Accounts = new mongoose.Schema({
    image_R: {
        type: String,
        required: false,
        default: ''
    },
    first_name_R: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 50,
        trim: true
    },
    last_name_R: {
        type: String,
        required: true,
        minlength: 1,
        maxlength: 50,
        trim: true
    },
    email_id_R: {
        type: String,
        required: true,
        unique: true,
        match: [/\S+@\S+\.\S+/, 'Please enter a valid email address']
    },
    create_password_R: {
        type: String,
        required: true,
        minlength: 6
    },
    register_number_R: {
        type: String,
        required: true,
        unique: true,
        minlength: 6,
        maxlength: 20
    },
    phone_number_R: {
        type: String,
        required: true,
        match: [/^\d{10}$/, 'Please enter a valid 10-digit phone number']
    },
    department_R: {
        type: String,
        required: true
    },
    year_R: {
        type: String,
        required: true
    },
    address_R: {
        type: String,
        required: true,
        maxlength: 255
    }
});

const HOD_DB = new mongoose.Schema({
    student_name: {
        type: String,
        required: true
    },
    register_number: {
        type: String,
        required: true,
        unique: true
    },
    department: {
        type: String,
        required: true
    },
    year: {
        type: String,
        required: true
    },
    purpose_of_outpass: {
        type: String,
        required: true
    },
    parent_conduct_number: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    from_date: {
        type: String,
        required: true
    },
    to_date: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: false
    },
    count: {
        type: Number,
        default: 0
    }
});

const Database1 = new mongoose.Schema({
    student_name: {
        type: String,
        required: true
    },
    register_number: {
        type: String,
        required: true
    },
    department: {
        type: String,
        required: true
    },
    year: {
        type: String,
        required: true
    },
    purpose_of_outpass: {
        type: String,
        required: true
    },
    parent_conduct_number: {
        type: String,
        required: true
    },
    from_date: {
        type: String,
        required: true
    },
    to_date: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    }
});

const Feedbacks = new mongoose.Schema({
    fb_name: {
        type: String,
        required: true
    },
    fb_email: {
        type: String,
        required: true,
        match: [/\S+@\S+\.\S+/, 'Please enter a valid email address']
    },
    fb_message: {
        type: String,
        required: true,
        maxlength: 1000
    }
});





const xeroxRequestSchema = new mongoose.Schema({
        identity: String,
          firstName:String,
          lastName: String,
          email: String,
          phone: String,
          docTitle: String,
          numPages: String,
          numCopies:  String,
          paperSize:  String,
          printType:  String,
          bindingOption:  String,
          uploadDocument:  String,
          totalamount:Number,
        comments:  String
        
      
})



const Account = mongoose.model("Account", Student_Accounts);
const Database = mongoose.model("Student", HOD_DB);
const ToDatabase = mongoose.model("ToDatabase", Database1);
const Feedback = mongoose.model("Feedback", Feedbacks);
const xeroxRequests= mongoose.model("xerox", xeroxRequestSchema);

module.exports = { Account, Database, ToDatabase, Feedback,xeroxRequests };
