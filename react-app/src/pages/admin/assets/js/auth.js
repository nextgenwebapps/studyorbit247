import { api } from "./api.js";
export async function requireAdmin(){try{return await api.me()}catch(error){location.replace("./index.html");throw error}}
export async function signOut(){try{await api.logout()}finally{location.replace("./index.html")}}
