import axios from 'axios';
import { useState, useEffect } from 'react';
import { authAPI } from './js/LogIn';
import { redirect } from 'react-router-dom';
function Calender()
{
    if (authAPI.verify)
    {
        return <h1>Страница пока в разработке</h1>;
    }
    else
    {
        redirect("/login")
    }
    
}

export default Calender;