import Student from "../models/Student.js"


export function getUser (req,res){
    Student.find().then((students)=>{
        res.json(students)
    })
}


export function createUser (req,res){
    //Read all data in request
    console.log(req.body)

    const student = new Student(req.body)

    student.save().then(()=>{
        res.json({
            message : "student cretaed succesfully "
        })
    })
}


export function deleteUser (req,res){
    res.json({
        message : "Student deleted succesfully"
    })
}

export function updateUser (req,res){
    res.json({
        message : "user updated"
    });
}