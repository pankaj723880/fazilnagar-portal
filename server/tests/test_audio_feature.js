import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to generate a valid 5-second PCM 16-bit WAV audio buffer
function generateTestWav(durationSeconds = 4, sampleRate = 22050, freq = 440) {
  const numChannels = 1;
  const numSamples = durationSeconds * sampleRate;
  const blockAlign = numChannels * 2;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  // fmt subchunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34); // 16 bits

  // data subchunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate sine wave samples
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sample = Math.sin(2 * Math.PI * freq * t) * 0.5; // amplitude 0.5
    const intSample = Math.floor(sample * 32767);
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

async function runTest() {
  console.log("=== Testing Reporter Audio Feature End-to-End ===");
  const testWavBuffer = generateTestWav(4.5, 22050, 520);
  const testAudioPath = path.join(__dirname, "temp_test_audio.wav");
  fs.writeFileSync(testAudioPath, testWavBuffer);
  console.log("1. Generated test WAV audio (4.5s, 520Hz tone, size:", testWavBuffer.length, "bytes)");

  // Generate admin JWT
  const secretKey = process.env.JWT_SECRET || "fallback_secret_key";
  const token = jwt.sign(
    { id: "650000000000000000000001", email: "pankaj723880@gmail.com", role: "admin", name: "Pankaj Admin" },
    secretKey,
    { expiresIn: "1h" }
  );

  // Submit via FormData to POST /api/news
  const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
  const crlf = "\r\n";

  let bodyParts = [];

  const addField = (name, val) => {
    bodyParts.push(
      `--${boundary}${crlf}Content-Disposition: form-data; name="${name}"${crlf}${crlf}${val}${crlf}`
    );
  };

  addField("title", "फाजिलनगर में नई स्वास्थ्य पहल | Health Awareness Campaign with Audio Dispatch");
  addField("titleHi", "सामुदायिक स्वास्थ्य केंद्र फाजिलनगर से विशेष ग्राउंड रिपोर्टिंग");
  addField("description", "CHC Fazilnagar has commenced a comprehensive town-wide wellness initiative. Listen to the ground reporter's audio dispatch above.");
  addField("summary", "CHC Fazilnagar has commenced a town-wide wellness initiative with live audio dispatch.");
  addField("category", "Healthcare");
  addField("location", "Hospital Road, Fazilnagar");
  addField("source", "Fazilnagar Health Bureau");
  addField("audioDuration", "4.5");
  addField("status", "approved");

  // Add audio file
  const fileHeader = `--${boundary}${crlf}Content-Disposition: form-data; name="audio"; filename="ground_dispatch.wav"${crlf}Content-Type: audio/wav${crlf}${crlf}`;
  const fileFooter = `${crlf}--${boundary}--${crlf}`;

  const headerBuf = Buffer.from(bodyParts.join("") + fileHeader, "utf-8");
  const footerBuf = Buffer.from(fileFooter, "utf-8");
  const payload = Buffer.concat([headerBuf, testWavBuffer, footerBuf]);

  console.log("2. Sending POST /api/news with audio payload...");
  const postRes = await fetch("http://localhost:5000/api/news", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      "Content-Length": String(payload.length),
    },
    body: payload,
  });

  const postJson = await postRes.json();
  console.log("POST /api/news Response Status:", postRes.status);
  console.log("Created News ID:", postJson._id);
  console.log("Audio URL:", postJson.audio);
  console.log("Audio Meta:", postJson.audioMeta);

  if (postRes.status !== 201) {
    throw new Error("POST /api/news failed: " + JSON.stringify(postJson));
  }
  if (!postJson.audio) {
    throw new Error("Missing audio URL in response!");
  }

  // Verify GET /api/news/feed returns the story with audio
  console.log("3. Verifying GET /api/news/feed...");
  const feedRes = await fetch(`http://localhost:5000/api/news/feed?storyId=${postJson._id}`);
  const feedJson = await feedRes.json();
  const matchedStory = (feedJson.stories || []).find((s) => s._id === postJson._id);

  if (!matchedStory) {
    throw new Error("Story not found in /api/news/feed!");
  }
  console.log("Found in feed:", matchedStory.title);
  console.log("Feed story audio URL:", matchedStory.audio);
  console.log("Feed story audio duration:", matchedStory.audioMeta?.duration);

  // Verify direct HTTP fetch of the audio URL returns 200/206 with audio/wav
  console.log("4. Verifying audio file download / byte-range streaming...");
  const audioFetchRes = await fetch(matchedStory.audio, {
    headers: { Range: "bytes=0-1024" },
  });
  console.log("Audio Stream Status:", audioFetchRes.status);
  console.log("Content-Range:", audioFetchRes.headers.get("content-range"));
  console.log("Content-Type:", audioFetchRes.headers.get("content-type"));

  if (audioFetchRes.status !== 200 && audioFetchRes.status !== 206) {
    throw new Error("Failed to stream audio file: " + audioFetchRes.status);
  }

  // Cleanup temp file
  try { fs.unlinkSync(testAudioPath); } catch (_) {}
  console.log("=== ALL REPORTER AUDIO BACKEND TESTS PASSED SUCCESSFULLY! ===");
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
