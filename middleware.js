const authPage = (permisos) => {
    return(req,res,next) =>{
        const userRole = req.session.rol
        if (permisos.includes(userRole)){
            next()
        }else{
            return res.status(401).json("No tienes permiso para acceder a este sitio")
        }
    }
}

const authSub = () => {

}

module.exports = {authPage, authSub}
