import { useEffect, useState } from "react";

function ChannelMembers({
  channelId,
  channelName,
  token,
  currentUser,
  onClose,
  refreshChannels,
}) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newUserId, setNewUserId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/channels/${channelId}/members`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to load members.");
        setMembers([]);
        return;
      }

      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching members:", err);
      setError("Something went wrong loading members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (channelId) {
      fetchMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  // Find the current logged-in user's own membership record to check their role
  const myMembership = members.find(
    (m) => m.User && m.User.id === currentUser.id,
  );
  const isAdmin = myMembership?.role === "admin";

  const handleAddMember = async (e) => {
    e.preventDefault();

    const userId = newUserId.trim();
    if (!userId) return;

    setActionLoading(true);
    setError("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/channels/${channelId}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: Number(userId) }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Could not add member.");
        return;
      }

      setNewUserId("");
      await fetchMembers();
      if (refreshChannels) await refreshChannels();
    } catch (err) {
      console.error("Error adding member:", err);
      setError("Something went wrong adding the member.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm("Remove this user from the channel?")) return;

    setActionLoading(true);
    setError("");

    try {
      const response = await fetch(
        `http://localhost:5000/api/channels/${channelId}/members/${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Could not remove member.");
        return;
      }

      await fetchMembers();
      if (refreshChannels) await refreshChannels();
    } catch (err) {
      console.error("Error removing member:", err);
      setError("Something went wrong removing the member.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="members-overlay" onClick={onClose}>
      <div className="members-panel" onClick={(e) => e.stopPropagation()}>
        <div className="members-header">
          <h3>#{channelName} — Members</h3>
          <button onClick={onClose} className="members-close-button" title="Close">
            ✕
          </button>
        </div>

        {loading && <p className="members-status">Loading members...</p>}

        {error && (
          <p className="members-error">
            {error}
          </p>
        )}

        {!loading && (
          <ul className="members-list">
            {members.map((member) => (
              <li key={member.id} className="member-row">
                <div>
                  <strong>
                    {member.User?.username || `User #${member.userId}`}
                  </strong>
                  <span className={`member-role member-role-${member.role}`}>{member.role}</span>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleRemoveMember(member.userId)}
                    disabled={actionLoading}
                    className="member-remove-button"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}

            {members.length === 0 && !error && (
              <li className="members-empty">
                No members yet.
              </li>
            )}
          </ul>
        )}

        {isAdmin && (
          <form onSubmit={handleAddMember} className="members-add-form">
            <input
              type="number"
              placeholder="User ID to add"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              className="members-input"
              min="1"
            />
            <button
              type="submit"
              disabled={actionLoading}
              className="members-add-button"
            >
              Add
            </button>
          </form>
        )}

        {!isAdmin && !loading && (
          <p className="members-note">
            Only channel admins can add or remove members.
          </p>
        )}
      </div>
    </div>
  );
}

export default ChannelMembers;
