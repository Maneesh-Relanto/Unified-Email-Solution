import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmailDetail } from "@/components/EmailDetail";
import type { Email } from "@/lib/mock-emails";

describe("EmailDetail", () => {
  const mockEmail: Email = {
    id: "test-1",
    from: {
      name: "John Doe",
      email: "john@example.com",
      avatar: "bg-blue-500",
    },
    subject: "Test Email Subject",
    preview: "This is a test email preview and content.",
    date: new Date("2024-02-08"),
    read: false,
    providerName: "Gmail",
  };

  it("renders empty state when email is undefined", () => {
    render(<EmailDetail email={undefined} />);
    expect(screen.getByText("Select an email to read")).toBeTruthy();
  });

  it("displays email subject", () => {
    render(<EmailDetail email={mockEmail} />);
    expect(screen.getByText("Test Email Subject")).toBeTruthy();
  });

  it("displays sender name and email", () => {
    render(<EmailDetail email={mockEmail} />);
    expect(screen.getByText("John Doe")).toBeTruthy();
    // Email is wrapped with angle brackets in the component
    const emailText = screen.getByText(/john@example\.com/);
    expect(emailText).toBeTruthy();
  });

  it("displays email preview/content", () => {
    render(<EmailDetail email={mockEmail} />);
    expect(
      screen.getByText("This is a test email preview and content.")
    ).toBeTruthy();
  });

  it("displays unread badge when email is unread", () => {
    render(<EmailDetail email={mockEmail} />);
    expect(screen.getByText("Unread")).toBeTruthy();
  });

  it("does not display unread badge when email is read", () => {
    const readEmail = { ...mockEmail, read: true };
    render(<EmailDetail email={readEmail} />);
    expect(screen.queryByText("Unread")).toBeNull();
  });

  it("displays provider name when available", () => {
    render(<EmailDetail email={mockEmail} />);
    const providerText = screen.getByText(/Via Gmail/);
    expect(providerText).toBeTruthy();
  });

  it("renders action buttons", () => {
    render(<EmailDetail email={mockEmail} />);
    expect(screen.getByText(/Reply/i)).toBeTruthy();
    expect(screen.getByText(/Forward/i)).toBeTruthy();
    expect(screen.getByText(/Archive/i)).toBeTruthy();
    expect(screen.getByText(/Delete/i)).toBeTruthy();
  });

  it("calls onClose when close button is clicked on mobile", () => {
    const onClose = vi.fn();
    render(<EmailDetail email={mockEmail} onClose={onClose} />);
    
    const closeButton = screen.getByLabelText("Close email");
    closeButton.click();
    expect(onClose).toHaveBeenCalled();
  });

  it("generates correct initials from sender name", () => {
    const emailWithDifferentName = {
      ...mockEmail,
      from: {
        ...mockEmail.from,
        name: "Jane Smith",
      },
    };
    render(<EmailDetail email={emailWithDifferentName} />);
    const avatar = screen.getByText("JS");
    expect(avatar).toBeTruthy();
  });

  it("handles single name sender", () => {
    const emailWithSingleName = {
      ...mockEmail,
      from: {
        ...mockEmail.from,
        name: "Madonna",
      },
    };
    render(<EmailDetail email={emailWithSingleName} />);
    const avatar = screen.getByText("M");
    expect(avatar).toBeTruthy();
  });

  it("displays recipient email", () => {
    render(<EmailDetail email={mockEmail} />);
    expect(screen.getByText("your.email@example.com")).toBeTruthy();
  });

  it("formats and displays date", () => {
    render(<EmailDetail email={mockEmail} />);
    const dateRegex = /ago|today|tomorrow/i;
    const emailContainer = screen.getByText("John Doe").closest("div")?.parentElement?.parentElement?.textContent || "";
    expect(dateRegex.test(emailContainer)).toBe(true);
  });

  it("applies correct styling for unread badge", () => {
    render(<EmailDetail email={mockEmail} />);
    const unreadBadge = screen.getByText("Unread");
    expect(unreadBadge.className).toContain("bg-blue-50");
    expect(unreadBadge.className).toContain("text-blue-700");
  });

  it("renders all action buttons", () => {
    render(<EmailDetail email={mockEmail} />);
    
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(4); // Reply, Forward, Archive, Delete, plus possible close button
  });

  it("does not show provider text when provider name missing", () => {
    const emailWithoutProvider = { ...mockEmail, providerName: undefined };
    render(<EmailDetail email={emailWithoutProvider} />);
    const viaText = screen.queryByText(/^Via/);
    expect(viaText).toBeNull();
  });

  it("uses fallback avatar color when not provided", () => {
    const emailWithoutAvatar = {
      ...mockEmail,
      from: {
        ...mockEmail.from,
        avatar: undefined,
      },
    };
    render(<EmailDetail email={emailWithoutAvatar} />);
    const avatar = screen.getByText("JD");
    expect(avatar.className).toContain("bg-gray-400");
  });

  it("renders header bar with email info", () => {
    render(<EmailDetail email={mockEmail} />);
    const subject = screen.getByText("Test Email Subject");
    expect(subject.className).toContain("font-bold");
  });

  it("renders action bar with all buttons at bottom", () => {
    render(<EmailDetail email={mockEmail} />);
    const replyBtn = screen.getByText(/Reply/i);
    const deleteBtn = screen.getByText(/Delete/i);
    expect(replyBtn).toBeTruthy();
    expect(deleteBtn).toBeTruthy();
  });
});
