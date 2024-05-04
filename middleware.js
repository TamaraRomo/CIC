const authPage = (permisos) => {
    return(req,res,next) =>{
        const userRole = req.session.rol
        if (permisos.includes(userRole)){
            next()
        }else{
            return res.status(404).send("Alto ahi. Que intentas hacer, no tienes los permisos necesarios para realizar esta acción.");
        }
    }
}

const authSub = () => {

}

module.exports = {authPage, authSub}
