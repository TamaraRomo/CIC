function validar() {
        var p1 = document.getElementById("password").value;
        var p2 = document.getElementById("password2").value;

        var espacios = false;
        var cont = 0;

        while (!espacios && (cont < p1.length)) {
            if (p1.charAt(cont) == " ")
                espacios = true;
            cont++;
        }

        if (espacios) {
            alert("La contraseña no puede contener espacios en blanco");
            return false;
        }

        if (p1 != p2) {
            alert("Las contraseñas deben coincidir");
            return false;
        } else {
            return true;
        }
    }



