import { useRef, useState, useEffect } from "react";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import avatarImg from "./assets/avatar.png";
import { AlarmPanel } from "./AlarmPanel";
import "./App.css";

interface MenuItem {
  readonly id: number;
  readonly label: string;
  readonly danger?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { id: 1, label: "Juegos serios" },
  { id: 2, label: "Alarmas" },
  { id: 3, label: "Notas" },
  { id: 4, label: "Links y herramientas de uso frecuente" },
  { id: 5, label: "Salud" },
  { id: 6, label: "Detener la aplicación", danger: true },
];

const AVATAR_SIZE = 300;

function getAlarmPanelSize(): { w: number; h: number } {
  return {
    w: Math.floor(window.screen.availWidth * 0.6),
    h: Math.floor(window.screen.availHeight * 0.7),
  };
}

function App() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showAlarms, setShowAlarms] = useState(false);
  const dragTimer = useRef(0);

  useEffect(() => {
    const win = getCurrentWindow();
    if (showAlarms) {
      const { w, h } = getAlarmPanelSize();
      win.setSize(new LogicalSize(w, h));
    } else {
      win.setSize(new LogicalSize(AVATAR_SIZE, AVATAR_SIZE));
    }
  }, [showAlarms]);

  const handleMouseDown = () => {
    dragTimer.current = window.setTimeout(async () => {
      await getCurrentWindow().startDragging();
    }, 200);
  };

  const handleMouseUp = () => {
    window.clearTimeout(dragTimer.current);
    dragTimer.current = 0;
  };

  const handleDoubleClick = () => {
    setShowMenu(true);
  };

  const handleMenuSelect = (id: number) => {
    setShowMenu(false);
    if (id === 2) {
      setShowAlarms(true);
    } else if (id === 6) {
      setShowConfirm(true);
    }
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    invoke("quit_app");
  };

  const handleReject = () => {
    setShowConfirm(false);
  };

  return (
    <>
      <div className="avatar-container">
        <img
          src={avatarImg}
          alt="Avatar"
          draggable={false}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        />
      </div>
      {showMenu && (
        <div className="menu-overlay" onClick={() => setShowMenu(false)}>
          <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
            {MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`menu-item ${item.danger ? "menu-item-danger" : ""}`}
                onClick={() => handleMenuSelect(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {showAlarms && (
        <AlarmPanel onClose={() => setShowAlarms(false)} />
      )}
      {showConfirm && (
        <div className="confirm-overlay" onClick={handleReject}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p>¿Detener la aplicación?</p>
            <div className="confirm-buttons">
              <button className="confirm-btn confirm-yes" onClick={handleConfirm}>Sí</button>
              <button className="confirm-btn confirm-no" onClick={handleReject}>No</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
