import axios from 'axios';
import { useState, useEffect } from 'react';
import { authAPI } from './js/LogIn';
function LogOut()
{
    return <button onClick={authAPI.logout}>Выйти</button>
}

export default LogOut;