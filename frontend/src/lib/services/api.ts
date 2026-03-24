import axios from "axios"


export async function promptOpenai(data: {message: string}){
    try{
        const response = await axios.post("http://localhost:8000/ai/chat_with_unihelp/", data)
        return response.data
    }
    catch(err:unknown){
        if(axios.isAxiosError(err)){
            throw new Error(err.response?.data.error || err.message)
        }
    }
}