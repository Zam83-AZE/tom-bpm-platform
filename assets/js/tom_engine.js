/**
 * FAYL: tom_engine.js (v3.4 - Fix: Variable Parsing Regex)
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
        
        // Button Logic
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

        // Log message
        if (act.type !== "EndEvent") {
            this.log(this.currentProcessName, `Addım Yükləndi: ${act.name} (${act.type})`);
        }

        // Validation Messages
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

        // Inputs Rendering
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
                
                if (inp.readonly === true || act.type === "ServiceTask") {
                    input.disabled = true;
                    input.style.backgroundColor = "#f0f0f0";
                    input.style.color = "#555";
                }
                div.appendChild(input);
                container.appendChild(div);
            });
        }

        // Process Logic
        if (act.type === "ServiceTask") {
            this.executeService(act); 
        } else if (act.type === "SubProcess") {
            setTimeout(() => this.enterSubProcess(act), 1000);
        
        } else if (act.type === "EndEvent") {
            if(btn) btn.style.display = "none";
            
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
            
            // --- PARSER DÜZƏLİŞİ ---
            const formatText = (text) => {
                if (!text) return '';
                // ${deyisen} formatını tutur
                return text.replace(/\$\{([\w\.]+)\}/g, (_, path) => {
                    const keys = path.split('.');
                    let value = this.data;
                    for (const key of keys) {
                        if (value && value[key] !== undefined) {
                            value = value[key];
                        } else {
                            return ''; // Tapılmasa boş qaytar
                        }
                    }
                    return value;
                });
            };

            let rawDesc = (act.description || '').replace(/^"|"$/g, ''); 
            const finalMessage = formatText(rawDesc);

            // UI Alert
            container.innerHTML = `
                <div style="
                    padding: 20px; 
                    background: ${isSuccess ? '#dcfce7' : '#fee2e2'}; 
                    border: 2px solid ${isSuccess ? '#22c55e' : '#ef4444'}; 
                    border-radius: 8px; 
                    text-align: center; 
                    animation: fadeIn 0.5s;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                ">
                    <h1 style="margin:0; font-size:40px">${isSuccess ? '🎉' : '⛔'}</h1>
                    <h2 style="margin:10px 0; color:${isSuccess ? '#15803d' : '#b91c1c'}">${act.name}</h2>
                    <p style="color:${isSuccess ? '#166534' : '#991b1b'}; font-weight:500; font-size:18px">
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
    }

    async executeService(act) {
        const activityKey = `${this.currentProcessName}:${act.id}`;
        
        if (this.executionState.get(activityKey) === 'COMPLETED') {
            this.nextStep(true);
            return;
        }

        this.log(this.currentProcessName, `⚙️ Servis İşə Düşdü: ${act.serviceName || 'Simulation'}`);

        const getSimFunction = (raw) => {
            if (!raw) return null;
            try { return new Function('data', raw.includes('=>') ? `return (${raw})(data)` : raw); } 
            catch (e) { return null; }
        };
        const simFunc = getSimFunction(act.simulation);

        await new Promise(r => setTimeout(r, 500));

        if (this.currentId !== act.id) {
            console.warn("⚠️ Servis ləğv edildi: İstifadəçi başqa addımdadır.");
            return;
        }

        try {
            let result = {};
            
            if (simFunc) {
                let tempRes = simFunc(this.data);
                if (tempRes instanceof Promise) {
                    tempRes = await tempRes;
                }
                
                if (this.currentId !== act.id) return;

                if (typeof tempRes === 'function') {
                    tempRes = tempRes(this.data);
                }

                result = { ...result, ...tempRes };
            }

            if (act.serviceName && this.services[act.serviceName]) {
                result = { ...result, ...this.services[act.serviceName].mockResponse };
            }
            
            if (!simFunc && !this.services[act.serviceName]) {
                result = { status: "SUCCESS" };
            }

            this.data = { ...this.data, ...result };
            this.log(this.currentProcessName, `✅ Servis Bitdi`, result);
            
            this.executionState.set(activityKey, 'COMPLETED');
            this.nextStep(true); 

        } catch (e) {
            console.error(e);
            if (this.currentId === act.id) {
                alert("Servis Xətası: " + e.message);
            }
        }
    }

    enterSubProcess(act) {
        this.stack.push({
            processName: this.currentProcessName,
            def: this.def,
            currentId: this.currentId,
            dataSnapshot: { ...this.data } 
        });

        this.currentProcessName = act.processName;
        this.def = this.registry[act.processName];
        this.currentId = this.def.startActivity;
        
        this.render();
    }

    returnFromSubProcess() {
        const childData = this.data;
        const parentState = this.stack.pop();
        
        this.data = { ...parentState.dataSnapshot, ...childData };

        this.currentProcessName = parentState.processName;
        this.def = parentState.def;
        this.currentId = parentState.currentId;

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
