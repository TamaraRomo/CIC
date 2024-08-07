const authPage = (permisos) => {
    return(req,res,next) =>{
        const userRole = req.session.rol
        if (permisos.includes(userRole)){
            next()
        }else{
            return res.status(404).render('error');
        }
    }
}

const authSub = () => {

}

module.exports = {authPage, authSub}
