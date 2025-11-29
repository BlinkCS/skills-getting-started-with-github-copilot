document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // helper: create initials from an email or name
  function getInitials(text) {
    if (!text) return "–";
    const name = text.split("@")[0].replace(/[^a-zA-Z0-9\s]/g, "");
    const parts = name.split(/[\s._-]+/).filter(Boolean);
    const first = parts[0] ? parts[0][0] : name[0];
    const second = parts[1] ? parts[1][0] : (name[1] || "");
    return (first + second).toUpperCase();
  }

  // helper: escape text to avoid injection into innerHTML
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select so we don't duplicate options on refresh
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // build participants markup
        let participantsMarkup = "";
        if (details.participants && details.participants.length > 0) {
          const items = details.participants
              .map(
                (p) =>
                  `<li class="participant-item" data-activity="${escapeHtml(name)}" data-email="${escapeHtml(
                    p
                  )}"><span class="participant-avatar">${getInitials(p)}</span><span class="participant-email">${escapeHtml(
                    p
                  )}</span><button type="button" class="participant-delete" title="Unregister ${escapeHtml(
                    p
                  )}" aria-label="Unregister ${escapeHtml(p)}">✖</button></li>`
              )
            .join("");
          participantsMarkup = `<ul class="participants-list">${items}</ul>`;
        } else {
          participantsMarkup = `<div class="no-participants">No participants yet.</div>`;
        }

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>

          <div class="participants-section" aria-label="Participants for ${escapeHtml(name)}">
            <div class="participants-title">Participants <span class="participants-count">(${details.participants.length})</span></div>
            ${participantsMarkup}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();

        // Refresh activity list so the new participant appears immediately
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Handle click events for participant delete buttons (event delegation)
  activitiesList.addEventListener("click", async (event) => {
    const deleteBtn = event.target.closest(".participant-delete");
    if (!deleteBtn) return;

    const li = deleteBtn.closest(".participant-item");
    if (!li) return;

    const email = li.dataset.email;
    const activity = li.dataset.activity;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/participant?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
      } else {
        messageDiv.textContent = result.detail || "An error occurred while unregistering";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Refresh the activities list (and the select) so UI updates
      fetchActivities();

      // Hide message after 4 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 4000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
