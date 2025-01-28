import OpenAI from "openai";
import "dotenv/config";

// Initialize the OpenAI client
const client = new OpenAI({
  apiKey: process.env["OPENAPI_TOKEN"], // Ensure your API key is set in the environment variables
});

async function interactWithAssistant() {
  try {
    const thread = await client.beta.threads.create({
      messages: [
        {
          role: "user",
          content: '"What should i do today?"',
        },
      ],
    });

    let threadId = thread.id;
    console.log("Created thread with Id: " + threadId);

    const assistantId = "asst_Li7yn9kdsLCnwyMaJZPhPy7m";
    const run = await client.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistantId,
      // instructions:
      //   "Do not give the user a name. Answer the question as a command.",
    });

    console.log("Run finished with status: " + run.status);

    if (run.status == "completed") {
      const messages = await client.beta.threads.messages.list(thread.id);
      const msg = messages.getPaginatedItems();
      return msg[0].content[0].text.value;
      // for (let i = 0; i < msg.length; i++) {
      //   console.log(i);
      //   console.log("--- start ---");
      //   console.log(msg[i].content[0]);
      //   console.log("--- end ---");
      // }
    }
  } catch (error) {
    console.error("Error interacting with the assistant:", error);
  }
}

const text = await interactWithAssistant();
console.log(text);
