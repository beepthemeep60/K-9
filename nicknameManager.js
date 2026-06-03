const activeTimers = new Map();

async function setTemporaryNickname(member, nickname, duration = 180000) {
  const userId = member.id;

  let originalName;

  if (activeTimers.has(userId)) {
    const existing = activeTimers.get(userId);

    clearTimeout(existing.timeoutId);

    // keep original nickname
    originalName = existing.oldNickname;
  } else {
    originalName = member.nickname;
  }

  await member.setNickname(nickname);

  const timeoutId = setTimeout(async () => {
    try {
      const session = activeTimers.get(userId);

      if (!session) return;

      await member.setNickname(session.oldNickname);
      activeTimers.delete(userId);
    } catch (err) {
      console.error(err);
    }
  }, duration);

  activeTimers.set(userId, {
    oldNickname: originalName,
    timeoutId,
  });

  return originalName;
}

module.exports = {
  setTemporaryNickname,
};
