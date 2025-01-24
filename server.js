import OpenAI from "openai";
import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenerativeAI } from "@google/generative-ai";
import readlinesync from 'readline-sync';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// const openaikey = process.env.OPENAI_API_KEY;
// const client = new OpenAI({
//     apiKey: openaikey,
// });
// import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});


function getWeatherDetails(city=''){
    if(city.toLowerCase() === 'bhopal') return 30;
    if(city.toLowerCase() === 'patna') return 25;
    if(city.toLowerCase() === 'delhi') return 35;
    if(city.toLowerCase() === 'mumbai') return 40;
    if(city.toLowerCase() === 'kolkata') return 20;
    if(city.toLowerCase() === 'chennai') return 20;
}


const SYSTEM_PROMPT =`
you are an ai assistant with START,PLAN,ACTION,Observation and Output State.
Wait for the user Prompt and first PLAN using available tools.
AFTER Planning,Take the action with approprite tools and wait for Observation based on Action.
Once you get the Observation , Return the ai response based opn START prompt and observation

Strictly follow the JSON output format as in examples.

Available tools:
-function getWeatherDetails(city: string):string
getWeatherDetaiils is a function that accepts city name as string as string and return the weathr of details ; 

Example:
START
{"type":"user","user":"what is the weather of sum of bhopal and patna ?"}
{"type":"plan","plan":"i will call the getWeatherDetails for bhopal"}
{"type":"action","function":"getWeatherDetails","input":"bhopal"}
{"type":"observation","observation":"30"}
{"type":"plan","plan":"i will call the getWeatherDetails for patna"}
{"type":"action","function":"getWeatherDetails","input":"patna"}
{"type":"observation","observation":"25"}
{"type":"output","output":"the sum of bhopal and patna is 55"}


`;

const tools ={
    "getWeatherDetails":getWeatherDetails,
}


var msg ="hey what is the weather of delhi ?";
async function chat(msg){
    try{
        client.chat.completions.create({
            messages:[{role:"user",content:msg}],
            model: "llama-3.3-70b-versatile"
        }).then(e=>{
            // console.log("line no 67 error ");
            console.log(e.choices[0].message.content);
        
        })
    }
    catch
    (error){
        console.error("vashu this is error ",error);
    }
}

async function agentchat(msg){
    try{
        client.chat.completions.create({
            messages:[{role:"system",content:SYSTEM_PROMPT},
                {
                    role:"user",
                    content:`{"type":"plan","plan":"I will call the getWeatherDetails function for Delhi to get the current weather"}`
                },
                {role:"user",content:`{"type":"action","function":"getWeatherDetails","input":"delhi"}`},
                {role:"user",content:`{"type":"observation","observation":"35"}`},
                {role:"user",content:msg}],
            model: "llama-3.3-70b-versatile"
        }).then(e=>{
            // console.log("line no 67 error ");
            // console.log(e.choices[0].message.content);
            console.log(e.choices);
        
        })
    }
    catch(error){
        console.error("vashu this is error ",error);
    }
}

// agentchat(msg);
// chat(msg);
const messages =[{role:"system",content:SYSTEM_PROMPT}];

while(true){
    const query = readlinesync.question("Enter your query:  ");
    const q = {
        type:'user',
        user:query,
        
    };
    messages.push({"role":"user",content:JSON.stringify(q)});

    while(true){
        const chat=client.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages:messages,
            response_format:{type:'json_object'},

        });
 
        const chatResult = await chat;
        const result = chatResult.choices[0].message.content;
        messages.push({role:'assistant',content:result});

        const call = JSON.parse(result);
        console.log(call);
        if(call.type=='output'){
            console.log('🤖 : ${call.output}');
            break;
        } else if(call.type="action"){
            
            // const fn = tools[call.function];
            // const observation = fn(call.input);
            // const obs = {type:'observation',"observation":observation};
            // message.push({role:'developer',content:JSON.stringify(obs)});
            const fn = tools[call.function];
    if (typeof fn !== 'function') {
        console.error(`Function ${call.function} not found in tools or is not a valid function.`);
        break;
    }
    try {
        const observation = fn(call.input); // Call the function
        const obs = { type: 'observation', observation: observation };
        messages.push({ role: 'developer', content: JSON.stringify(obs) });
    } catch (error) {
        console.error(`Error while executing ${call.function}:`, error);
        break;
    }
        }
        
    }

}


