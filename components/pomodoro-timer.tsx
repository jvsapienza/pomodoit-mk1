"use client"; // Habilita renderização no client-side

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  MinusIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  RefreshCwIcon,
  XCircleIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Tipos para o timer e para as sessões
type TimerStatus = "idle" | "running" | "paused";
type SessionType = "work" | "break";

interface PomodoroState {
  workDuration: number;
  breakDuration: number;
  currentTime: number;
  currentSession: SessionType;
  timerStatus: TimerStatus;
  userName: string; // Nome de usuário
}

// Tipo de log de sessão (para salvar no localStorage)
interface SessionLog {
  userName: string;
  sessionType: SessionType;   // "work" ou "break"
  startTime: number;          // timestamp (Date.now())
  endTime: number;            // timestamp (Date.now())
  interrupted: boolean;       // se a sessão foi interrompida
}

export default function PomodoroComponent() {
  // Estado inicial
  const [state, setState] = useState<PomodoroState>({
    workDuration: 90 * 60,     // 90 minutos
    breakDuration: 5 * 60,
    currentTime: 90 * 60,
    currentSession: "work",
    timerStatus: "idle",
    userName: "",             // Inicia sem nome
  });

  // Guarda o momento de início da sessão atual (para log)
  const [sessionStart, setSessionStart] = useState<number | null>(null);

  // Referência para o intervalo do timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Efeito responsável por decrementar o tempo quando o timer está "running"
  useEffect(() => {
    if (state.timerStatus === "running" && state.currentTime > 0) {
      timerRef.current = setInterval(() => {
        setState((prev) => ({ ...prev, currentTime: prev.currentTime - 1 }));
      }, 1000);
    } else if (state.currentTime === 0) {
      clearInterval(timerRef.current as NodeJS.Timeout);
      // Sessão terminou sem interrupção — registra e passa para a próxima
      handleEndSession(false);
      handleSessionSwitch();
    }
    return () => clearInterval(timerRef.current as NodeJS.Timeout);
  }, [state.timerStatus, state.currentTime]);

  // Função que alterna entre "work" e "break" ao finalizar o tempo
  const handleSessionSwitch = (): void => {
    setState((prev) => {
      const isWorkSession = prev.currentSession === "work";
      return {
        ...prev,
        currentSession: isWorkSession ? "break" : "work",
        currentTime: isWorkSession ? prev.breakDuration : prev.workDuration,
      };
    });
    // Inicia uma nova sessão automaticamente
    startNewSession();
  };

  // Inicia uma nova sessão, guardando o timestamp de início
  const startNewSession = (): void => {
    setSessionStart(Date.now());
  };

  // Finaliza (ou interrompe) a sessão atual e salva no localStorage
  const handleEndSession = (wasInterrupted: boolean): void => {
    if (!sessionStart) return; // não há sessão em andamento

    const endTime = Date.now();
    const newSessionLog: SessionLog = {
      userName: state.userName,
      sessionType: state.currentSession,
      startTime: sessionStart,
      endTime,
      interrupted: wasInterrupted,
    };

    // Salva no localStorage
    saveSessionToLocalStorage(newSessionLog);

    // Indica que não temos mais sessão em andamento
    setSessionStart(null);
  };

  // Salva o registro da sessão no localStorage
  const saveSessionToLocalStorage = (session: SessionLog): void => {
    const storedData = localStorage.getItem("pomodoitSessions");
    let sessionLogs: SessionLog[] = [];

    if (storedData) {
      sessionLogs = JSON.parse(storedData);
    }
    sessionLogs.push(session);

    localStorage.setItem("pomodoitSessions", JSON.stringify(sessionLogs));
  };

  // Lida com START e PAUSE do timer
  const handleStartPause = (): void => {
    // Primeiro, checa se o usuário digitou um nome
    if (!state.userName) {
      alert("Por favor, insira seu nome antes de iniciar!");
      return;
    }

    if (state.timerStatus === "running") {
      // Se já estava rodando, vai pausar
      setState((prev) => ({ ...prev, timerStatus: "paused" }));
      clearInterval(timerRef.current as NodeJS.Timeout);
    } else {
      // Se estava parado/pausado, inicia (ou retoma)
      setState((prev) => ({ ...prev, timerStatus: "running" }));

      // Se ainda não temos um sessionStart, significa que é uma nova sessão
      if (!sessionStart) {
        startNewSession();
      }
    }
  };

  // Interrompe a sessão antes do timer chegar a zero
  const handleInterrupt = (): void => {
    // Só interrompe se estiver rodando ou pausado
    if (state.timerStatus !== "idle") {
      clearInterval(timerRef.current as NodeJS.Timeout);
      // Registra como interrompida
      handleEndSession(true);

      // Reseta o estado
      setState((prev) => ({
        ...prev,
        currentTime: prev.workDuration,
        currentSession: "work",
        timerStatus: "idle",
      }));
    }
  };

  // Reseta o timer (e, se estava rodando, considera como sessão interrompida)
  const handleReset = (): void => {
    clearInterval(timerRef.current as NodeJS.Timeout);

    // Se o timer estava ativo (running ou paused), finalizamos como interrompido
    if (state.timerStatus === "running" || state.timerStatus === "paused") {
      handleEndSession(true);
    }

    setState((prev) => ({
      ...prev,
      currentTime: prev.workDuration,
      currentSession: "work",
      timerStatus: "idle",
    }));
  };

  // Ajusta a duração de trabalho ou pausa
  const handleDurationChange = (type: SessionType, increment: boolean): void => {
    setState((prev) => {
      const durationChange = increment ? 60 : -60;
      if (type === "work") {
        return {
          ...prev,
          workDuration: Math.max(60, prev.workDuration + durationChange),
          currentTime:
            prev.currentSession === "work"
              ? Math.max(60, prev.workDuration + durationChange)
              : prev.currentTime,
        };
      } else {
        return {
          ...prev,
          breakDuration: Math.max(60, prev.breakDuration + durationChange),
          currentTime:
            prev.currentSession === "break"
              ? Math.max(60, prev.breakDuration + durationChange)
              : prev.currentTime,
        };
      }
    });
  };

  // Formata o tempo em mm:ss
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Lida com a digitação do nome de usuário
  const handleUserNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState((prev) => ({ ...prev, userName: e.target.value }));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className="w-full max-w-md p-6 bg-white dark:bg-gray-800 shadow-lg rounded-lg">
        <div className="flex flex-col items-center justify-center gap-6">
          <h1 className="text-4xl font-bold">Pomodoit</h1>
          <p>Share your focus and motivate your friends</p>

          {/* Campo para nome do usuário */}
          <div className="w-full flex flex-col gap-2">
            <label className="text-sm font-semibold" htmlFor="userName">
              Nome de Usuário:
            </label>
            <input
              id="userName"
              type="text"
              value={state.userName}
              onChange={handleUserNameChange}
              className="p-2 border border-gray-300 rounded"
              placeholder="Digite seu nome"
            />
          </div>

          {/* Mostra a sessão atual e o tempo */}
          <div className="flex flex-col items-center gap-4">
            <div className="text-2xl font-medium">
              {state.currentSession === "work" ? "Work" : "Break"}
            </div>
            <div className="text-8xl font-bold">
              {formatTime(state.currentTime)}
            </div>
          </div>

          {/* Botões de controle */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleDurationChange("work", false)}
            >
              <MinusIcon className="h-6 w-6" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleDurationChange("work", true)}
            >
              <PlusIcon className="h-6 w-6" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleStartPause}>
              {state.timerStatus === "running" ? (
                <PauseIcon className="h-6 w-6" />
              ) : (
                <PlayIcon className="h-6 w-6" />
              )}
            </Button>
            <Button variant="outline" size="icon" onClick={handleReset}>
              <RefreshCwIcon className="h-6 w-6" />
            </Button>
            {/* Novo botão para interromper a sessão */}
            <Button variant="outline" size="icon" onClick={handleInterrupt}>
              <XCircleIcon className="h-6 w-6" />
            </Button>
          </div>

          {/* AlertDialog explicando a Pomodoro Technique */}
          <div className="p-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="default">need a user?</Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="w-full max-w-2xl p-4 md:p-6">
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    <strong> ➡️ Explanation of Pomodoro Technique 🔥</strong>
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    <strong>The Pomodoro Technique</strong>
                    {`
 é um método de gerenciamento de tempo que usa um timer para quebrar o trabalho em 
intervalos chamados Pomodoros. Normalmente, o timer é de 25 minutos, mas pode ser 
ajustado de acordo com suas necessidades. Os passos básicos são:
`}{" "}
                    <br />
                    <br />
                    <ol>
                      <li>1. Selecione uma única tarefa para focar.</li>
                      <li>
                        2. Defina um cronômetro para 25-30 min. e trabalhe até o
                        cronômetro encerrar.
                      </li>
                      <li>
                        3. Faça uma pausa de 5 min. — levante, tome uma água,
                        alongue-se.
                      </li>
                      <li>4. Repita esses passos 4 vezes.</li>
                      <li>5. Faça uma pausa maior (20-30 min.).</li>
                    </ol>
                    <br />
                    <Button>
                      <a
                        href="https://todoist.com/productivity-methods/pomodoro-technique"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Click Here to Read more!
                      </a>
                    </Button>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction>Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </Card>
    </div>
  );
}
