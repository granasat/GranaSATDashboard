
/**
 * This function checks whether the file uploaded by the user is a valid image,
 * otherwise, it will raise an alert window
 * (https://www.thesoftwareguy.in/validate-single-multiple-image-field-using-javascript/)
 */
function validateImage() {

    var formData = new FormData();

    var file = document.getElementById("img").files[0];

    formData.append("Filedata", file);
    var type = file.type.split('/').pop().toLowerCase();
    if (type != "jpeg" && type != "jpg" && type != "png" && type != "bmp") {
        alert('Please select a valid image file');
        document.getElementById("img").value = '';
        return false;
    }
    else if (file.size > 1024000) {
        alert('The image is too big (1MB max.)');
        document.getElementById("img").value = '';
        return false;
    }

    else {
        return true;
    }
}