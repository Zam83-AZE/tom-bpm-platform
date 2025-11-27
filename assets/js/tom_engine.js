/**
 * FAYL: tom_engine.js (v3.1 - Fix: SubProcess Data Merge)
 */
class ModularEngine {
    constructor(registry, startName) {
        if (!registry || !registry[startName]) {
            alert("XƏTA: Proses tapılmadı! (" + startName + ")");
            return;
        }
        this.registry = registry;
        this.stack = []; 
        this.currentProcessName = startName;
        this.def = registry[startName];
        this.currentId = this.def.startActivity;
        this.data = {}; 
        this.services = window.TOM_SERVICES || {}; 
        this.executionState = new Map(); 
        
        this.log("SYSTEM", `Engine başladı: ${startName}`);
        this.render();
    }

    getCurrent() { 
        return this.def.activities.find(a => a.id === this.currentId); 
    }

    log(module, msg, data = null) {
        const logContainer = document.getElementById("debugLog");
        if (!logContainer) return;
        const div = document.createElement("div");
        div.className = "log-item";
        let html = `<span class="log-time">${new Date().toLocaleTimeString()}</span> <span class="log-module">[${module}]</span> <span class="log-msg">${msg}</span>`;
        if (data) html += `<div class="log-data">${JSON.stringify(data, null, 2)}</div>`;
        div.innerHTML = html;
        logContainer.prepend(div);
    }

    render() {
        const act = this.getCurrent();
        if (!act) return alert("Xəta: Addım tapılmadı -> " + this.currentId);

        const container = document.getElementById("formContainer");
        const btn = document.getElementById("nextBtn");
        const title = document.getElementById("stepTitle");
        
        if(title) title.innerText = `${act.name} (${act.role || 'System'})`;
        if(container) container.innerHTML = "";
        
        if(btn) {
            if (act.type === "UserTask") {
                btn.style.display = "block";
                btn.disabled = false;
                btn.innerHTML = "Davam Et";
                btn.onclick = () => this.nextStep(false); 
            } else {
                btn.disabled = true;
                btn.innerHTML = "İcra edilir...";
            }
        }

        if (act.type !== "EndEvent") {
            this.log(this.currentProcessName, `Addım Yükləndi: ${act.name} (${act.type})`);
        }

        if (this.data.status === 'ERROR' && this.data.message) {
            const errorDiv = document.createElement("div");
            errorDiv.className = "alert";
            errorDiv.style.background = "#ffebee";
            errorDiv.style.color = "#c62828";
            errorDiv.innerHTML = `<strong>⚠️ Diqqət:</strong> ${this.data.message}`;
            container.appendChild(errorDiv);
            this.data.status = ""; 
            this.data.message = "";
        }

        if (act.inputs && container) {
            act.inputs.forEach(inp => {
                const div = document.createElement("div");
                div.innerHTML = `<label style='display:block; margin-top:10px; font-weight:bold; color:#555'>${inp.label}</label>`;
                
                let input;
                if (inp.type === 'select') {
                    input = document.createElement('select');
                    let opts = inp.options;
                    if (typeof opts === 'string') {
                        opts = opts.replace(/"/g, '').split(',').map(s => s.trim());
                    } else if (!Array.isArray(opts)) opts = [];

                    opts.forEach(o => {
                        const opt = document.createElement("option");
                        opt.text = opt.value = o;
                        input.add(opt);
                    });
                } else {
                    input = document.createElement('input');
                    input.type = inp.type;
                }
                
                input.style.width = "100%";
                input.style.padding = "8px";
                input.style.marginTop = "5px";
                input.style.border = "1px solid #ccc";
                input.style.borderRadius = "4px";
                input.id = inp.name;
                input.value = this.data[inp.name] || "";
                
                if (act.type === "ServiceTask") {
                    input.disabled = true;
                    input.style.backgroundColor = "#f0f0f0";
                }
                div.appendChild(input);
                container.appendChild(div);
            });
        }

        if (act.type === "ServiceTask") {
            setTimeout(() => this.executeService(act), 500); 
        } else if (act.type === "SubProcess") {
            setTimeout(() => this.enterSubProcess(act), 1000);
        
        } else if (act.type === "EndEvent") {
            if(btn) btn.style.display = "none";
            
            // SubProcess bitibsə geri qayıt
            if (this.stack.length > 0) {
                container.innerHTML = `
                    <div class="alert" style="background:#e0f2fe; border-color:#0ea5e9; color:#0369a1; text-align:center">
                        🔄 <b>${act.name}</b> tamamlandı.<br>Ana prosesə qayıdılır...
                    </div>`;
                this.log(this.currentProcessName, "SubProcess Bitdi. Data:", this.data);
                setTimeout(() => this.returnFromSubProcess(), 1500);
                return; 
            }

            const isSuccess = !act.id.toLowerCase().includes("reject");

            // 🛠️ BU HİSSƏ YENİDİR: Mətni Dəyişənlə Əvəz Edən Kod
            const formatText = (str) => {
                if (!str) return '';
                // ${deyisen} formatını axtarır və data içindən tapıb qoyur
                return str.replace(/\$\{([\w\.]+)\}/g, (_, key) => {
                    return this.data[key] !== undefined ? this.data[key] : '';
                });
            };

            // Description-u format edirik (Dırnaqları təmizləyirik)
            let rawDesc = (act.description || '').replace(/^"|"$/g, ''); 
            const finalMessage = formatText(rawDesc); // <-- Artıq burada real mesaj olur

            // Ekrana yazdırırıq
            container.innerHTML = `
                <div style="
                    padding: 20px; 
                    background: ${isSuccess ? '#dcfce7' : '#fee2e2'}; 
                    border: 2px solid ${isSuccess ? '#22c55e' : '#ef4444'}; 
                    border-radius: 8px; 
                    text-align: center; 
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                ">
                    <h1 style="margin:0; font-size:40px">${isSuccess ? '🎉' : '⛔'}</h1>
                    <h2 style="margin:10px 0; color:${isSuccess ? '#15803d' : '#b91c1c'}">${act.name}</h2>
                    
                    <p style="color:${isSuccess ? '#166534' : '#991b1b'}; font-weight:bold; font-size:18px">
                        ${finalMessage}
                    </p>
                </div>
            `;

            this.log(this.currentProcessName, `🏁 PROSES BİTDİ: ${act.name}`, {
                status: isSuccess ? "SUCCESS" : "REJECTED",
                message: finalMessage,
                final_data: this.data 
            });
    }

    // ASYNC SERVICE EXECUTION (Real API və Təhlükəsizlik ilə)
    async executeService(act) {
        const activityKey = `${this.currentProcessName}:${act.id}`;
        
        // 1. Təkrar icranın qarşısını almaq
        if (this.executionState.get(activityKey) === 'COMPLETED') {
            this.nextStep(true);
            return;
        }

        this.log(this.currentProcessName, `⚙️ Servis İşə Düşdü: ${act.serviceName || 'Simulation'}`);

        // Simulyasiya funksiyasını hazırlayırıq
        const getSimFunction = (raw) => {
            if (!raw) return null;
            try { return new Function('data', raw.includes('=>') ? `return (${raw})(data)` : raw); } 
            catch (e) { return null; }
        };
        const simFunc = getSimFunction(act.simulation);

        // 2. Vizual gecikmə (Loading effekti üçün)
        await new Promise(r => setTimeout(r, 500));

        // ⚠️ ZOMBIE PROTECTION 1: Gecikmədən sonra yoxlayırıq
        // Əgər istifadəçi bu 0.5 saniyə ərzində başqa addıma keçibsə, dayandır.
        if (this.currentId !== act.id) {
            console.warn("⚠️ Servis ləğv edildi: İstifadəçi başqa addımdadır.");
            return;
        }

        try {
            let result = {};
            
            // 3. Daxili Məntiq (Real API burada işləyəcək)
            if (simFunc) {
                let tempRes = simFunc(this.data);
                
                // Əgər nəticə bir Promise-dirsə (məsələn fetch), cavabı gözləyirik
                if (tempRes instanceof Promise) {
                    tempRes = await tempRes;
                }
                
                // ⚠️ ZOMBIE PROTECTION 2: API cavabı gələndən sonra yenə yoxlayırıq
                // API çox uzun çəkibsə və istifadəçi çıxıbsa, nəticəni tətbiq etmə.
                if (this.currentId !== act.id) return;

                // İkiqat funksiya xətasına qarşı sığorta ((d)=>(d)=>{})
                if (typeof tempRes === 'function') {
                    tempRes = tempRes(this.data);
                }

                result = { ...result, ...tempRes };
            }

            // 4. Xarici Mock Cavab (varsa)
            if (act.serviceName && this.services[act.serviceName]) {
                result = { ...result, ...this.services[act.serviceName].mockResponse };
            }
            
            // 5. Heç nə yoxdursa Default Uğur
            if (!simFunc && !this.services[act.serviceName]) {
                result = { status: "SUCCESS" };
            }

            // Nəticəni tətbiq et
            this.data = { ...this.data, ...result };
            this.log(this.currentProcessName, `✅ Servis Bitdi`, result);
            
            this.executionState.set(activityKey, 'COMPLETED');
            this.nextStep(true); 

        } catch (e) {
            console.error(e);
            // Xətanı yalnız istifadəçi hələ də həmin addımdadırsa göstər
            if (this.currentId === act.id) {
                alert("Servis Xətası: " + e.message);
            }
        }
    }

    // ✅ DÜZƏLİŞ: SubProcess-ə girəndə datanı yadda saxla
    enterSubProcess(act) {
        this.stack.push({
            processName: this.currentProcessName,
            def: this.def,
            currentId: this.currentId,
            // Datanın kopyasını yadda saxlayırıq (Backup)
            dataSnapshot: { ...this.data } 
        });

        this.currentProcessName = act.processName;
        this.def = this.registry[act.processName];
        this.currentId = this.def.startActivity;
        
        // Child proses də eyni datanı görür (Inheritance)
        this.render();
    }

    // ✅ DÜZƏLİŞ: SubProcess-dən qayıdanda yeni datanı birləşdir
    returnFromSubProcess() {
        // 1. Uşaq prosesdəki ən son datanı götür (risk_score buradadır)
        const childData = this.data;

        // 2. Stack-dən ananı çıxar
        const parentState = this.stack.pop();

        // 3. MERGE: Ana prosesin köhnə datası + Uşaq prosesin yeni datası
        // Bu sətir risk_score-un ana prosesə keçməsini təmin edir
        this.data = { ...parentState.dataSnapshot, ...childData };

        // 4. Context-i bərpa et
        this.currentProcessName = parentState.processName;
        this.def = parentState.def;
        this.currentId = parentState.currentId;

        // 5. Davam et
        this.nextStep(true);
    }

    nextStep(auto = false) {
        const act = this.getCurrent();
        
        if (act.type === "UserTask" && auto === true) {
            return; 
        }

        if (!auto && act.inputs) {
            let inputs = {};
            act.inputs.forEach(i => {
                const el = document.getElementById(i.name); 
                if (el) inputs[i.name] = el.value;
            });
            this.data = { ...this.data, ...inputs };
            this.log(this.currentProcessName, "User Data", inputs);
        }

        const transitions = this.def.transitions.filter(t => t.from === this.currentId);
        let nextId = null;

        for (const t of transitions) {
            if (t.condition && t.condition.trim() !== "") {
                try {
                    // ✅ ARTIQ risk_score BURADA ƏLÇATAN OLACAQ
                    const keys = Object.keys(this.data);
                    const values = Object.values(this.data);
                    const func = new Function(...keys, `return ${t.condition};`);
                    if (func(...values)) {
                        nextId = t.to;
                        this.log(this.currentProcessName, `Şərt Ödənildi: ${t.condition} -> ${t.to}`);
                        break;
                    }
                } catch (e) { console.error(e); }
            } else {
                nextId = t.to;
                break; 
            }
        }

        if (nextId) {
            const nextKey = `${this.currentProcessName}:${nextId}`;
            if (this.executionState.get(nextKey) === 'COMPLETED') {
                this.executionState.set(nextKey, 'IDLE');
            }
            this.currentId = nextId;
            this.render();
        } else {
            if (act.type !== "EndEvent") {
                alert("🛑 Proses dayandı: Keçid yoxdur.");
            }
        }
    }
}
