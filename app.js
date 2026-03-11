const { exec } = require("child_process");
const path = require("path");

const player = require("play-sound")({
    player: "C:\\Program Files\\MPV Player\\mpv.com",
    args: ["--really-quiet"],
});

// ==========================================
// CONFIGURATION
// ==========================================
const FOCUS_TIME = 25 * 60; // 1 Menit
const REST_TIME = 5 * 60;     // 15 Detik
// ==========================================

const soundFokus = path.join(__dirname, "sound", "hey.mp3");
const soundIstirahat = path.join(__dirname, "sound", "break.mp3");
const gifIstirahat = path.join(__dirname, "gif", "break.gif");

let totalSet = parseInt(process.argv[2]) || 1;
let setSekarang = 1;
let sedangFokus = true;
let sisaWaktu = FOCUS_TIME;
let timerHandle = null;

function mulaiSesiIstirahat() {
    if (!sedangFokus) {
        // Gunakan path dengan format yang dimengerti CMD
        const mpv = `"C:\\Program Files\\MPV Player\\mpv.com"`;
        const gif = `"${gifIstirahat}"`;

        // Trik Windows: start "" "Path Dengan Spasi"
        // /C bakal langsung nutup terminal kalau MPV beres, tapi tetep nunggu MPV selesai
        const perintah = `start "" ${mpv} --vo=tct --loop=inf --no-audio --really-quiet --terminal=yes ${gif}`;

        exec(perintah, (err) => {
            if (err) console.error("Gagal buka jendela GIF:", err);
        });

        putarLaguLoop();
    }
}

// Tukang bersih-bersih saat aplikasi ditutup (Ctrl+C) atau selesai
function bersihkanMPV() {
    exec("taskkill /F /IM mpv.com /T", () => {
        process.exit();
    });
}

process.on('SIGINT', () => {
    bersihkanMPV();
});

process.on('exit', () => {
    exec("taskkill /F /IM mpv.com /T");
});

function putarLaguLoop() {
    if (!sedangFokus) {
        player.play(soundIstirahat, { mpv: ["--no-video"] }, (err) => {
            if (!err && !sedangFokus) putarLaguLoop();
        });
    }
}

function jalankanTimer() {
    timerHandle = setInterval(() => {
        const m = Math.floor(sisaWaktu / 60);
        const s = sisaWaktu % 60;
        const displayWaktu = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

        if (sedangFokus) {
            console.clear();
            console.log(`===================================`);
            console.log(` SET: ${setSekarang} / ${totalSet}`);
            console.log(` STATUS: 🔴 FOKUS`);
            console.log(` SISA WAKTU: ${displayWaktu}`);
            console.log(`===================================`);
        } else {
            // Gunakan ANSI escape untuk update timer tanpa flicker di terminal utama
            process.stdout.write(`\x1b[H\x1b[K\x1b[32m 🟢 ISTIRAHAT | Sisa Waktu: ${displayWaktu} \x1b[0m\n`);
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
        console.log("\nSesi fokus beres! Memutar notifikasi...");
        player.play(soundFokus, (err) => {
            sedangFokus = false;
            sisaWaktu = REST_TIME;

            console.clear(); 
            mulaiSesiIstirahat();
            jalankanTimer();
        });
    } else {
        sedangFokus = true;

        // Taskkill otomatis menutup jendela terminal GIF yang tadi dibuka
        exec("taskkill /F /IM mpv.com /T", (err) => {
            if (setSekarang < totalSet) {
                setSekarang++;
                sisaWaktu = FOCUS_TIME;
                jalankanTimer();
            } else {
                console.clear();
                console.log("\nSEMUA SET SELESAI!");
                process.exit();
            }
        });
    }
}

// Jalankan aplikasi
jalankanTimer();