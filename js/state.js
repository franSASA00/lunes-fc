// Centralized mutable app state, shared (as live object references) across all modules.
// Instead of many independent `let` bindings, everything lives on one object so that
// any module can read/write the current session state consistently.
export const state = {
  currentUser: null,
  currentGroup: null,
  currentTab: 'jugadores',
  groupMembers: [],
  groupUnsubscribe: null,
  currentTeams: null,
  // Live Match State
  liveMatch: {
    active: false,
    timer: 0,
    timerInterval: null,
    scoreA: 0,
    scoreB: 0,
    events: [],
    teams: null,
  },
};
