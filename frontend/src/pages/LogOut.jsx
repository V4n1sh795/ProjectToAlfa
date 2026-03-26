import axios from 'axios';
import { useState, useEffect } from 'react';
import { authAPI } from './js/LogIn';
function LogOut()
{
    if (authAPI.verify)
    {
        return <button onClick={authAPI.logout}>Выйти</button>
    }
    else
    {
        redirect("/login")
    }
    
}

export default LogOut;