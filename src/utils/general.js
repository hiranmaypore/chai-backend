import bcrypt from "bcrypt"


export const isPasswordCorrect = (dbPass,incomimngPass) =>{
    return bcrypt.compare(dbPass,incomimngPass)
}