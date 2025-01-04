window.addEventListener('DOMContentLoaded', (event) => {
    const submitButton = document.getElementById('submitButton');
    submitButton.addEventListener('click', function() {
        alertmsg(); 
    });
});

function alertmsg() {
    var firstName = document.getElementById("first-name-val").value;
    var email = document.getElementById("email-id-val").value;
    var password = document.getElementById("create-pass-val").value;
    var confirmPassword = document.getElementById("reenter-pass-val").value;

    if (firstName && email && password && confirmPassword) {
       

    if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return false; 
    }
    var confirmSuccess = alert("Registered Successfully ")
}
}