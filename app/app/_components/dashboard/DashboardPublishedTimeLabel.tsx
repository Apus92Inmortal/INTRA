"use client";

import { useEffect, useState } from "react";

function getRelativePublishedState(createdAt: string) {
  const createdMs = new Date(createdAt).getTime();

  if (Number.isNaN(createdMs)) {
    return {
      label: "Publicado hace poco",
      nextUpdateMs: 60_000,
    };
  }

  const diffMs = Math.max(Date.now() - createdMs, 0);
  const minuteMs = 60_000;
  const hourMs = 60 * minuteMs;

  if (diffMs < minuteMs) {
    return {
      label: "Publicado hace poco",
      nextUpdateMs: Math.max(minuteMs - diffMs, 1_000),
    };
  }

  const totalMinutes = Math.floor(diffMs / minuteMs);

  if (totalMinutes < 5) {
    const nextMinute = (totalMinutes + 1) * minuteMs;
    return {
      label: `Hace ${totalMinutes} min`,
      nextUpdateMs: Math.max(nextMinute - diffMs, 1_000),
    };
  }

  if (totalMinutes < 30) {
    const roundedMinutes = Math.floor(totalMinutes / 5) * 5;
    const nextBoundary = (Math.floor(totalMinutes / 5) + 1) * 5 * minuteMs;
    return {
      label: `Hace ${roundedMinutes} min`,
      nextUpdateMs: Math.max(nextBoundary - diffMs, 1_000),
    };
  }

  if (diffMs < hourMs) {
    return {
      label: "Hace 30 min",
      nextUpdateMs: Math.max(hourMs - diffMs, 1_000),
    };
  }

  const totalHours = Math.floor(diffMs / hourMs);
  const nextHour = (totalHours + 1) * hourMs;

  return {
    label: `Hace ${totalHours} h`,
    nextUpdateMs: Math.max(nextHour - diffMs, 1_000),
  };
}

export default function DashboardPublishedTimeLabel({
  createdAt,
}: {
  createdAt: string;
}) {
  const [tick, setTick] = useState(0);

  void tick;
  const state = getRelativePublishedState(createdAt);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTick((value) => value + 1);
    }, state.nextUpdateMs);

    return () => window.clearTimeout(timer);
  }, [state.nextUpdateMs]);

  return <span className="intra-caption">{state.label}</span>;
}
