const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const readline = require("readline-sync");

const mpvPath = "C:\\Program Files\\MPV Player\\mpv.com";

// ==========================================
// CONFIGURATION
// ==========================================
let focus_time = 25 * 60;
let rest_time = 5 * 60;
const VOL_NOTIF = 55;
const VOL_MUSIK = 70;

const mpvGuiPath = mpvPath.replace(".com", ".exe");

const isTesting = process.argv[2] === "test";
if (isTesting) {
    focus_time = 2;
    rest_time = 5;
}
// ==========================================

let daftarTujuan = [];
const soundSelesaiFokus = path.join(__dirname, "sound", "focus_end.mp3");
const soundMulaiFokus = path.join(__dirname, "sound", "focus_start.mp3");
const soundIstirahat = path.join(__dirname, "sound", "break.mp3");

const gifIstirahat = path.join(__dirname, "gif", "break.gif");
const gifSelesaiFokus = path.join(__dirname, "gif", "focus_end.gif");
const gifMulaiFokus = path.join(__dirname, "gif", "focus_start.gif");

let totalSet = parseInt(process.argv[2]) || 1;
if (isTesting) totalSet = 2;

let setSekarang = 1;
let sedangFokus = true;
let sisaWaktu = focus_time;
let timerHandle = null;

function putarAudio(filePath, volume, callback = () => {}) {
    const perintah = `"${mpvPath}" --really-quiet --no-video --volume=${volume} "${filePath}"`;
    exec(perintah, callback);
}

function playGif(gifPath, options) {
    // Konfigurasi MPV
    const mpvOptions = {
        gifSize: "400x400",
        xPos: "100%",
        yPos: "0%",
        blurred: options ? options.blurred : false,
    };

    const perintah = `"${mpvGuiPath}" ${mpvOptions.blurred ? "--vf=scale=64:64:flags=neighbor --sws-scaler=point" : ""} --scale=nearest --loop=inf --no-audio --really-quiet --autofit=${mpvOptions.gifSize} --geometry=${mpvOptions.xPos}:${mpvOptions.yPos} --ontop --no-border "${gifPath}"`;

    exec(perintah);
}

function mulaiSesiIstirahat() {
    if (!sedangFokus) {
        playGif(gifIstirahat, { blurred: true });
        putarLaguLoop();
    }
}

function putarLaguLoop() {
    if (!sedangFokus) {
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

function simpanLaporan() {
    const waktuSkrg = new Date().toLocaleDateString("id-ID");
    const jamSkrg = new Date().toLocaleTimeString("id-ID");
    const filePath = path.join(__dirname, "/report/laporan_pomo.txt");

    let konten =
        `\nREKAP SESI - ${waktuSkrg} ${jamSkrg}\n` + "=".repeat(30) + "\n";

    daftarTujuan.forEach((item) => {
        konten += `[Sesi ${item.sesi}] ${item.teks} | Selesai: ${item.date}\n`;
    });

    try {
        fs.appendFileSync(filePath, konten + "\n", "utf8");
        console.log("\n" + konten);
        console.log("✔ Laporan berhasil disimpan di: " + filePath);
    } catch (err) {
        console.error("❌ Gagal simpan file:", err.message);
    }
}

function mintaTujuan() {
    console.clear();
    console.log(`=== SESI FOKUS #${setSekarang} ===`);
    const jawaban = readline.question("Apa tujuan sesi ini? ");
    daftarTujuan.push({
        sesi: setSekarang,
        teks: jawaban || "Tanpa tujuan",
        date: new Date().toLocaleTimeString("id-ID"),
    });
}

function jalankanTimer() {
    if (timerHandle) clearInterval(timerHandle);
    timerHandle = setInterval(() => {
        const m = Math.floor(sisaWaktu / 60);
        const s = sisaWaktu % 60;
        const displayWaktu = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

        console.clear();
        console.log(`===================================`);
        console.log(` SET: ${setSekarang} / ${totalSet}`);
        console.log(` STATUS: ${sedangFokus ? "🔴 FOKUS" : "🟢 ISTIRAHAT"}`);

        const tujuan = isTesting
            ? "Testing"
            : daftarTujuan[setSekarang - 1]?.teks;
        console.log(` TUJUAN: ${tujuan}`);

        console.log(` SISA WAKTU: ${displayWaktu}`);
        console.log(`===================================`);

        if (sisaWaktu <= 0) {
            pindahState();
        } else {
            sisaWaktu--;
        }
    }, 1000);
}

function pindahState() {
    clearInterval(timerHandle);

    // focus -> break
    if (sedangFokus) {
        bersihkanMPV(() => {
            playGif(gifSelesaiFokus);

            // Play focus_end sound
            putarAudio(soundSelesaiFokus, VOL_NOTIF, () => {
                bersihkanMPV(() => {
                    sedangFokus = false;
                    sisaWaktu = rest_time;
                    mulaiSesiIstirahat();
                    jalankanTimer();
                });
            });
        });
    } else {
        // break -> focus
        bersihkanMPV(() => {
            sedangFokus = true;
            if (setSekarang < totalSet) {
                setSekarang++;
                playGif(gifMulaiFokus);
                putarAudio(soundMulaiFokus, VOL_NOTIF);

                if (!isTesting) mintaTujuan();

                sisaWaktu = focus_time;
                jalankanTimer();
            } else {
                console.clear();
                if (!isTesting) simpanLaporan();
                process.exit();
            }
        });
    }
}

process.on("SIGINT", () => bersihkanMPV(() => process.exit()));

// Start program
bersihkanMPV(() => {
    if (!isTesting) mintaTujuan();
    jalankanTimer();
});
