import OpenAI from "openai";
import dotenv from "dotenv";
import readlinesync from "readline-sync";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY, // Replace with your OpenAI API key
  baseURL: "https://api.groq.com/openai/v1", // Ensure this is the correct API base URL
});

// Mock tools for weather details
function getWeatherDetails(city = "") {
  const weatherData = {
    bhopal: 30,
    patna: 25,
    delhi: 35,
    mumbai: 40,
    kolkata: 20,
    chennai: 20,
  };
  return weatherData[city.toLowerCase()] || "Unknown city";
}

const SYSTEM_PROMPT = `
You are an AI assistant that follows a structured START, PLAN, ACTION, OBSERVATION, and OUTPUT format.
Your role is to respond to user queries, plan actions, execute tools, observe results, and produce an output.
Use JSON format strictly in your responses.

Available tools:
- function getWeatherDetails(city: string): string
  This function accepts a city name as input and returns the temperature of that city.

Example interaction:
START
{"type":"user","user":"What is the temperature sum of Bhopal and Patna?"}
{"type":"plan","plan":"I will call the getWeatherDetails function for Bhopal and Patna."}
{"type":"action","function":"getWeatherDetails","input":"bhopal"}
{"type":"observation","observation":"30"}
{"type":"action","function":"getWeatherDetails","input":"patna"}
{"type":"observation","observation":"25"}
{"type":"output","output":"The sum of temperatures for Bhopal and Patna is 55°C."}
`;

const tools = {
  getWeatherDetails,
};

const messages = [{ role: "system", content: SYSTEM_PROMPT }];

(async () => {
  while (true) {
    const query = readlinesync.question("Enter your query: ");
    const userMessage = {
      type: "user",
      user: query,
    };
    messages.push({ role: "user", content: JSON.stringify(userMessage) });

    while (true) {
      try {
        // Send a request to the language model
        const chat = await client.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: messages,
          response_format: { type: "json_object" },
        });

        const chatResult = chat;
        const result = chatResult.choices[0].message.content;

        // Parse the JSON result safely
        let call;
        try {
          call = JSON.parse(result);
        } catch (error) {
          console.error("Error parsing result as JSON:", error);
          break;
        }

        messages.push({ role: "assistant", content: result });
        console.log(call); // Debugging output to check structure

        // Handle the different types of responses
        if (call.type === "output") {
          console.log(`🤖 : ${call.output}`);
          break;
        } else if (call.type === "action") {
          // Retrieve and execute the function safely
          const fn = tools[call.function];
          if (typeof fn !== "function") {
            console.error(`Function ${call.function} not found in tools or is not a valid function.`);
            break;
          }

          try {
            const observation = fn(call.input); // Call the function
            const obs = { type: "observation", observation: observation };
            messages.push({ role: "user", content: JSON.stringify(obs) });
          } catch (error) {
            console.error(`Error while executing ${call.function}:`, error);
            break;
          }
        }
      } catch (error) {
        console.error("Error during chat completion:", error);
        break;
      }
    }
  }
})();
