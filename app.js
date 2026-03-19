const { exec } = require("child_process");
const path = require("path");

const mpvPath = "C:\\Program Files\\MPV Player\\mpv.com";

// ==========================================
// CONFIGURATION
// ==========================================
const FOCUS_TIME = 25 * 60; // 25 Menit (dalam detik)
const REST_TIME = 5 * 60;   // 5 Menit (dalam detik)
const VOL_NOTIF = 40;       // Volume kencang buat pengingat
const VOL_MUSIK = 60;       // Volume pelan buat musik latar
// ==========================================

const soundSelesaiFokus = path.join(__dirname, "sound", "focus_end.mp3");
const soundMulaiFokus = path.join(__dirname, "sound", "focus_start.mp3");
const soundIstirahat = path.join(__dirname, "sound", "break.mp3");
const gifIstirahat = path.join(__dirname, "gif", "break.gif");

let totalSet = parseInt(process.argv[2]) || 1;
let setSekarang = 1;
let sedangFokus = true;
let sisaWaktu = FOCUS_TIME;
let timerHandle = null;

function putarAudio(filePath, volume, callback = () => {}) {
    const perintah = `"${mpvPath}" --really-quiet --no-video --volume=${volume} "${filePath}"`;
    exec(perintah, callback);
}

function mulaiSesiIstirahat() {
    if (!sedangFokus) {
        const gif = `"${gifIstirahat}"`;
        const perintah = `start "" "${mpvPath}" --vo=tct --loop=inf --no-audio --really-quiet --terminal=yes ${gif}`;
        
        exec(perintah);
        putarLaguLoop();
    }
}

function putarLaguLoop() {
    if (!sedangFokus) {
        // Pakai volume kecil (VOL_MUSIK)
        putarAudio(soundIstirahat, VOL_MUSIK, (err) => {
            if (!sedangFokus) putarLaguLoop();
        });
    }
}

function bersihkanMPV(callback) {
    exec(`taskkill /F /IM mpv.com /T & taskkill /F /IM mpv.exe /T`, () => {
        if (callback) callback();
    });
}

function jalankanTimer() {
    if (timerHandle) clearInterval(timerHandle);

    timerHandle = setInterval(() => {
        const m = Math.floor(sisaWaktu / 60);
        const s = sisaWaktu % 60;
        const displayWaktu = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

        console.clear();
        if (sedangFokus) {
            console.log(`===================================`);
            console.log(` SET: ${setSekarang} / ${totalSet}`);
            console.log(` STATUS: 🔴 FOKUS`);
            console.log(` SISA WAKTU: ${displayWaktu}`);
            console.log(`===================================`);
        } else {
            console.log(`===================================`);
            console.log(` STATUS: 🟢 ISTIRAHAT`);
            console.log(` SISA WAKTU: ${displayWaktu}`);
            console.log(`===================================`);
        }

        if (sisaWaktu <= 0) {
            pindahState();
        } else {
            sisaWaktu--;
        }
    }, 1000);
}

function pindahState() {
    clearInterval(timerHandle);

    if (sedangFokus) {
        bersihkanMPV(() => {
            console.log("\nSesi fokus beres! Memutar notifikasi...");
            putarAudio(soundSelesaiFokus, VOL_NOTIF, () => {
                sedangFokus = false;
                sisaWaktu = REST_TIME;
                mulaiSesiIstirahat();
                jalankanTimer();
            });
        });
    } else {
        bersihkanMPV(() => {
            sedangFokus = true;
            if (setSekarang < totalSet) {
                putarAudio(soundMulaiFokus, VOL_NOTIF);
                setSekarang++;
                sisaWaktu = FOCUS_TIME;
                jalankanTimer();
            } else {
                console.clear();
                const totalMenit = (totalSet * FOCUS_TIME) / 60;
                console.log(`🔥 SEMUA SET SELESAI! 🔥`);
                console.log(`Kamu sudah fokus selama ${totalMenit.toFixed(1)} menit.`);
                bersihkanMPV(() => process.exit());
            }
        });
    }
}

process.on("SIGINT", () => {
    bersihkanMPV(() => process.exit());
});

// Start program
bersihkanMPV(() => {
    jalankanTimer();
});