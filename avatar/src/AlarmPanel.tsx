import { useState, useEffect, useRef, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "./AlarmPanel.css";

const TONES = [
  { id: "beep", label: "Beep estándar" },
  { id: "chime", label: "Chime suave" },
  { id: "alarm", label: "Alarma fuerte" },
  { id: "bell", label: "Campana" },
];

interface DailyAlarm {
  id: string;
  name: string;
  time: string;
  tone: string;
  enabled: boolean;
}

interface DateAlarm {
  id: string;
  name: string;
  datetime: string;
  tone: string;
  enabled: boolean;
}

interface CronoItem {
  id: string;
  name: string;
  totalSeconds: number;
  remaining: number;
  tone: string;
  running: boolean;
  finished: boolean;
}

type Tab = "daily" | "date" | "crono";

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(toneId: string) {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;

    if (toneId === "beep") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 800;
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (toneId === "chime") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 1200;
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.8);
    } else if (toneId === "alarm") {
      for (let i = 0; i < 4; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = i % 2 === 0 ? 1000 : 1500;
        const start = now + i * 0.25;
        gain.gain.setValueAtTime(0.3, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.2);
      }
    } else if (toneId === "bell") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 600;
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.5);
    }
  } catch {
    // audio not available
  }
}

function genId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function formatRemaining(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function AlarmPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("daily");
  const [isMaximized, setIsMaximized] = useState(false);
  const appWindow = getCurrentWindow();

  useEffect(() => {
    let mounted = true;
    const checkMaximized = async () => {
      if (mounted) {
        const max = await appWindow.isMaximized();
        setIsMaximized(max);
      }
    };
    checkMaximized();
    const unlisten = appWindow.listen("tauri://resize", checkMaximized);
    return () => {
      mounted = false;
      unlisten.then((u) => u());
    };
  }, [appWindow]);

  const handleMinimize = useCallback(async () => {
    await appWindow.minimize();
  }, [appWindow]);

  const handleToggleMaximize = useCallback(async () => {
    await appWindow.toggleMaximize();
  }, [appWindow]);

  // daily alarms
  const [dailyAlarms, setDailyAlarms] = useState<DailyAlarm[]>([]);
  const [dailyName, setDailyName] = useState("");
  const [dailyTime, setDailyTime] = useState("08:00");
  const [dailyTone, setDailyTone] = useState("beep");
  const [editingDailyId, setEditingDailyId] = useState<string | null>(null);

  // date alarms
  const [dateAlarms, setDateAlarms] = useState<DateAlarm[]>([]);
  const [dateName, setDateName] = useState("");
  const [dateDatetime, setDateDatetime] = useState("");
  const [dateTone, setDateTone] = useState("beep");
  const [editingDateId, setEditingDateId] = useState<string | null>(null);

  // crono (timer)
  const [cronos, setCronos] = useState<CronoItem[]>([]);
  const [cronoName, setCronoName] = useState("");
  const [cronoMinutes, setCronoMinutes] = useState(5);
  const [cronoTone, setCronoTone] = useState("beep");
  const [editingCronoId, setEditingCronoId] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);

  // check daily alarms every 30s
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const hh = now.getHours().toString().padStart(2, "0");
      const mm = now.getMinutes().toString().padStart(2, "0");
      const currentTime = `${hh}:${mm}`;

      setDailyAlarms((prev) => {
        let changed = false;
        const next = prev.map((a) => {
          if (!a.enabled || a.time !== currentTime) return a;
          changed = true;
          playTone(a.tone);
          return { ...a };
        });
        return changed ? next : prev;
      });

      setDateAlarms((prev) => {
        let changed = false;
        const nowISO = now.toISOString().slice(0, 16);
        const next = prev.map((a) => {
          if (!a.enabled) return a;
          if (a.datetime === nowISO) {
            changed = true;
            playTone(a.tone);
            return { ...a, enabled: false };
          }
          return a;
        });
        return changed ? next : prev;
      });
    };

    intervalRef.current = window.setInterval(check, 30000);
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, []);

  // crono countdown
  useEffect(() => {
    const tick = () => {
      setCronos((prev) => {
        let changed = false;
        const next = prev.map((c) => {
          if (!c.running || c.finished) return c;
          const rem = c.remaining - 1;
          if (rem <= 0) {
            changed = true;
            playTone(c.tone);
            return { ...c, remaining: 0, running: false, finished: true };
          }
          changed = true;
          return { ...c, remaining: rem };
        });
        return changed ? next : prev;
      });
    };

    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // --- Daily handlers ---
  const handleAddDaily = useCallback(() => {
    if (!dailyName.trim() || !dailyTime) return;
    if (editingDailyId) {
      setDailyAlarms((prev) =>
        prev.map((a) =>
          a.id === editingDailyId
            ? { ...a, name: dailyName.trim(), time: dailyTime, tone: dailyTone }
            : a
        )
      );
      setEditingDailyId(null);
    } else {
      setDailyAlarms((prev) => [
        ...prev,
        { id: genId(), name: dailyName.trim(), time: dailyTime, tone: dailyTone, enabled: true },
      ]);
    }
    setDailyName("");
  }, [dailyName, dailyTime, dailyTone, editingDailyId]);

  const handleEditDaily = useCallback((a: DailyAlarm) => {
    setDailyName(a.name);
    setDailyTime(a.time);
    setDailyTone(a.tone);
    setEditingDailyId(a.id);
  }, []);

  const handleRemoveDaily = useCallback((id: string) => {
    setDailyAlarms((prev) => prev.filter((a) => a.id !== id));
    if (editingDailyId === id) {
      setEditingDailyId(null);
      setDailyName("");
    }
  }, [editingDailyId]);

  const handleToggleDaily = useCallback((id: string) => {
    setDailyAlarms((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  }, []);

  const cancelEditDaily = useCallback(() => {
    setEditingDailyId(null);
    setDailyName("");
  }, []);

  // --- Date handlers ---
  const handleAddDate = useCallback(() => {
    if (!dateName.trim() || !dateDatetime) return;
    if (editingDateId) {
      setDateAlarms((prev) =>
        prev.map((a) =>
          a.id === editingDateId
            ? { ...a, name: dateName.trim(), datetime: dateDatetime, tone: dateTone }
            : a
        )
      );
      setEditingDateId(null);
    } else {
      setDateAlarms((prev) => [
        ...prev,
        { id: genId(), name: dateName.trim(), datetime: dateDatetime, tone: dateTone, enabled: true },
      ]);
    }
    setDateName("");
    setDateDatetime("");
  }, [dateName, dateDatetime, dateTone, editingDateId]);

  const handleEditDate = useCallback((a: DateAlarm) => {
    setDateName(a.name);
    setDateDatetime(a.datetime);
    setDateTone(a.tone);
    setEditingDateId(a.id);
  }, []);

  const handleRemoveDate = useCallback((id: string) => {
    setDateAlarms((prev) => prev.filter((a) => a.id !== id));
    if (editingDateId === id) {
      setEditingDateId(null);
      setDateName("");
      setDateDatetime("");
    }
  }, [editingDateId]);

  const handleToggleDate = useCallback((id: string) => {
    setDateAlarms((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  }, []);

  const cancelEditDate = useCallback(() => {
    setEditingDateId(null);
    setDateName("");
    setDateDatetime("");
  }, []);

  // --- Crono handlers ---
  const handleAddCrono = useCallback(() => {
    if (cronoMinutes < 1) return;
    if (editingCronoId) {
      setCronos((prev) =>
        prev.map((c) =>
          c.id === editingCronoId
            ? { ...c, name: cronoName.trim() || c.name, totalSeconds: cronoMinutes * 60, remaining: cronoMinutes * 60, tone: cronoTone, running: false, finished: false }
            : c
        )
      );
      setEditingCronoId(null);
    } else {
      setCronos((prev) => [
        ...prev,
        {
          id: genId(),
          name: cronoName.trim() || `Cronómetro ${prev.length + 1}`,
          totalSeconds: cronoMinutes * 60,
          remaining: cronoMinutes * 60,
          tone: cronoTone,
          running: true,
          finished: false,
        },
      ]);
    }
    setCronoName("");
  }, [cronoMinutes, cronoName, cronoTone, editingCronoId]);

  const handleEditCrono = useCallback((c: CronoItem) => {
    setCronoName(c.name);
    setCronoMinutes(Math.floor(c.totalSeconds / 60));
    setCronoTone(c.tone);
    setEditingCronoId(c.id);
  }, []);

  const handleRemoveCrono = useCallback((id: string) => {
    setCronos((prev) => prev.filter((c) => c.id !== id));
    if (editingCronoId === id) {
      setEditingCronoId(null);
      setCronoName("");
    }
  }, [editingCronoId]);

  const handleToggleCrono = useCallback((id: string) => {
    setCronos((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (c.finished) {
          return { ...c, remaining: c.totalSeconds, running: true, finished: false };
        }
        return { ...c, running: !c.running };
      })
    );
  }, []);

  const cancelEditCrono = useCallback(() => {
    setEditingCronoId(null);
    setCronoName("");
  }, []);

  const dailyFormTitle = editingDailyId ? "Editar alarma" : "Nueva alarma";
  const dateFormTitle = editingDateId ? "Editar alarma" : "Nueva alarma";
  const cronoFormTitle = editingCronoId ? "Editar cronómetro" : "Nuevo cronómetro";

  const dailySubmitLabel = editingDailyId ? "Guardar" : "Agregar";
  const dateSubmitLabel = editingDateId ? "Guardar" : "Agregar";
  const cronoSubmitLabel = editingCronoId ? "Guardar" : "Iniciar";

  return (
    <div className="alarm-overlay">
      <div className="alarm-panel" onClick={(e) => e.stopPropagation()}>
        <div className="alarm-header" data-tauri-drag-region>
          <span className="alarm-header-title">Alarmas</span>
          <div className="alarm-title-buttons">
            <button className="alarm-title-btn" onClick={handleMinimize} title="Minimizar">─</button>
            <button className="alarm-title-btn" onClick={handleToggleMaximize} title={isMaximized ? "Restaurar" : "Maximizar"}>
              {isMaximized ? "❐" : "□"}
            </button>
            <button className="alarm-title-btn alarm-title-close" onClick={onClose} title="Cerrar">✕</button>
          </div>
        </div>

        <div className="alarm-tabs">
          <button
            className={`alarm-tab ${tab === "daily" ? "active" : ""}`}
            onClick={() => setTab("daily")}
          >
            Diaria
          </button>
          <button
            className={`alarm-tab ${tab === "date" ? "active" : ""}`}
            onClick={() => setTab("date")}
          >
            Fecha
          </button>
          <button
            className={`alarm-tab ${tab === "crono" ? "active" : ""}`}
            onClick={() => setTab("crono")}
          >
            Cronómetro
          </button>
        </div>

        <div className="alarm-body">
          {tab === "daily" && (
            <div className="alarm-layout">
              <div className="alarm-list-section">
                <h3>Alarmas activas</h3>
                {dailyAlarms.length === 0 && (
                  <p className="alarm-empty">Sin alarmas</p>
                )}
                {dailyAlarms.map((a) => (
                  <div key={a.id} className={`alarm-item ${!a.enabled ? "disabled" : ""}`}>
                    <div className="alarm-item-info">
                      <span className="alarm-item-time">{a.time}</span>
                      <span className="alarm-item-name">{a.name}</span>
                      <span className="alarm-item-tone">
                        {TONES.find((t) => t.id === a.tone)?.label}
                      </span>
                    </div>
                    <div className="alarm-item-actions">
                      <button
                        className={`alarm-toggle ${a.enabled ? "on" : "off"}`}
                        onClick={() => handleToggleDaily(a.id)}
                      >
                        {a.enabled ? "ON" : "OFF"}
                      </button>
                      <button className="alarm-edit-btn" onClick={() => handleEditDaily(a)}>
                        Editar
                      </button>
                      <button className="alarm-remove" onClick={() => handleRemoveDaily(a.id)}>
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="alarm-form-section">
                <h3>{dailyFormTitle}</h3>
                <div className="alarm-form">
                  <label>
                    Nombre
                    <input
                      type="text"
                      value={dailyName}
                      onChange={(e) => setDailyName(e.target.value)}
                      placeholder="Nombre de la alarma"
                    />
                  </label>
                  <label>
                    Hora
                    <input
                      type="time"
                      value={dailyTime}
                      onChange={(e) => setDailyTime(e.target.value)}
                    />
                  </label>
                  <label>
                    Tono
                    <select value={dailyTone} onChange={(e) => setDailyTone(e.target.value)}>
                      {TONES.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="alarm-add-btn" style={{ flex: 1 }} onClick={handleAddDaily}>
                      {dailySubmitLabel}
                    </button>
                    {editingDailyId && (
                      <button
                        className="alarm-add-btn"
                        style={{ flex: 1, background: "#444" }}
                        onClick={cancelEditDaily}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "date" && (
            <div className="alarm-layout">
              <div className="alarm-list-section">
                <h3>Alarmas activas</h3>
                {dateAlarms.length === 0 && (
                  <p className="alarm-empty">Sin alarmas</p>
                )}
                {dateAlarms.map((a) => (
                  <div key={a.id} className={`alarm-item ${!a.enabled ? "disabled" : ""}`}>
                    <div className="alarm-item-info">
                      <span className="alarm-item-time">{a.datetime.replace("T", " ")}</span>
                      <span className="alarm-item-name">{a.name}</span>
                      <span className="alarm-item-tone">
                        {TONES.find((t) => t.id === a.tone)?.label}
                      </span>
                    </div>
                    <div className="alarm-item-actions">
                      <button
                        className={`alarm-toggle ${a.enabled ? "on" : "off"}`}
                        onClick={() => handleToggleDate(a.id)}
                      >
                        {a.enabled ? "ON" : "OFF"}
                      </button>
                      <button className="alarm-edit-btn" onClick={() => handleEditDate(a)}>
                        Editar
                      </button>
                      <button className="alarm-remove" onClick={() => handleRemoveDate(a.id)}>
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="alarm-form-section">
                <h3>{dateFormTitle}</h3>
                <div className="alarm-form">
                  <label>
                    Nombre
                    <input
                      type="text"
                      value={dateName}
                      onChange={(e) => setDateName(e.target.value)}
                      placeholder="Nombre de la alarma"
                    />
                  </label>
                  <label>
                    Fecha y hora
                    <input
                      type="datetime-local"
                      value={dateDatetime}
                      onChange={(e) => setDateDatetime(e.target.value)}
                    />
                  </label>
                  <label>
                    Tono
                    <select value={dateTone} onChange={(e) => setDateTone(e.target.value)}>
                      {TONES.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="alarm-add-btn" style={{ flex: 1 }} onClick={handleAddDate}>
                      {dateSubmitLabel}
                    </button>
                    {editingDateId && (
                      <button
                        className="alarm-add-btn"
                        style={{ flex: 1, background: "#444" }}
                        onClick={cancelEditDate}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

           {tab === "crono" && (
             <div className="alarm-layout">
               <div className="alarm-list-section">
                 <h3>Cronómetros</h3>
                 {cronos.length === 0 && (
                   <p className="alarm-empty">Sin cronómetros</p>
                 )}
                 {cronos.map((c) => (
                   <div key={c.id} className={`alarm-item ${c.finished ? "finished" : ""}`}>
                     <div className="alarm-item-info">
                       <span className="alarm-item-time">
                         {c.finished ? "¡LISTO!" : formatRemaining(c.remaining)}
                       </span>
                       <span className="alarm-item-name">{c.name}</span>
                       <span className="alarm-item-tone">
                         {TONES.find((t) => t.id === c.tone)?.label}
                       </span>
                     </div>
                     <div className="alarm-item-actions">
                       <button
                         className={`alarm-toggle ${c.running ? "on" : c.finished ? "on" : "off"}`}
                         onClick={() => handleToggleCrono(c.id)}
                       >
                         {c.finished ? "RE" : c.running ? "ON" : "OFF"}
                       </button>
                       <button className="alarm-edit-btn" onClick={() => handleEditCrono(c)}>
                         Editar
                       </button>
                       <button className="alarm-remove" onClick={() => handleRemoveCrono(c.id)}>
                         ✕
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
               <div className="alarm-form-section">
                 <h3>{cronoFormTitle}</h3>
                 <div className="alarm-form">
                   <label>
                     Nombre
                     <input
                       type="text"
                       value={cronoName}
                       onChange={(e) => setCronoName(e.target.value)}
                       placeholder="Nombre (opcional)"
                     />
                   </label>
                   <label>
                     Minutos
                     <input
                       type="number"
                       min={1}
                       max={1440}
                       value={cronoMinutes}
                       onChange={(e) => setCronoMinutes(Math.max(1, Number(e.target.value)))}
                     />
                   </label>
                   <label>
                     Tono
                     <select value={cronoTone} onChange={(e) => setCronoTone(e.target.value)}>
                       {TONES.map((t) => (
                         <option key={t.id} value={t.id}>{t.label}</option>
                       ))}
                     </select>
                   </label>
                   <div style={{ display: "flex", gap: 6 }}>
                     <button className="alarm-add-btn" style={{ flex: 1 }} onClick={handleAddCrono}>
                       {cronoSubmitLabel}
                     </button>
                     {editingCronoId && (
                       <button
                         className="alarm-add-btn"
                         style={{ flex: 1, background: "#444" }}
                         onClick={cancelEditCrono}
                       >
                         Cancelar
                       </button>
                     )}
                   </div>
                 </div>
               </div>
             </div>
           )}
         </div>
       </div>
     </div>
   );
}

export { AlarmPanel };
