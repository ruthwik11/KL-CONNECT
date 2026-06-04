import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";
import { AppError } from "../utils/errors";

export async function createPoll(req: Request, res: Response, next: NextFunction) {
  try {
    const { question, options, activeDate } = req.body;

    if (!question || !options || !activeDate) {
      throw new AppError(400, "Question, options (array of strings), and activeDate (YYYY-MM-DD) are required");
    }

    if (!Array.isArray(options) || options.length < 2) {
      throw new AppError(400, "Options must be an array with at least 2 selections");
    }

    // Enforce YYYY-MM-DD date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(activeDate)) {
      throw new AppError(400, "activeDate must be formatted as YYYY-MM-DD");
    }

    const parsedDate = new Date(activeDate);
    if (isNaN(parsedDate.getTime())) {
      throw new AppError(400, "Invalid activeDate value");
    }

    // Enforce one-poll-per-day rule (active_date unique constraint in Prisma)
    const existing = await prisma.poll.findUnique({
      where: { active_date: parsedDate },
    });

    if (existing) {
      throw new AppError(409, `A poll is already deployed for date: ${activeDate}`);
    }

    const poll = await prisma.poll.create({
      data: {
        question,
        options, // Automatically saved as Json in schema
        active_date: parsedDate,
        is_archived: false,
      },
    });

    res.status(201).json({
      status: "success",
      poll,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTodayPoll(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.user_id;

    // Get today's system date at midnight UTC/local
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const poll = await prisma.poll.findFirst({
      where: {
        active_date: today,
        is_archived: false,
      },
    });

    if (!poll) {
      return res.status(200).json({
        status: "success",
        poll: null,
        message: "No daily engagement poll scheduled for today",
      });
    }

    // Check if current user has already voted on this poll
    const vote = await prisma.pollVote.findUnique({
      where: {
        poll_id_user_id: {
          poll_id: poll.poll_id,
          user_id: userId,
        },
      },
    });

    res.status(200).json({
      status: "success",
      poll,
      hasVoted: !!vote,
      votedOptionIdx: vote ? vote.selected_option : null,
    });
  } catch (error) {
    next(error);
  }
}

export async function castVote(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params; // Poll ID
    const { selectedOption } = req.body; // Option Index (0-indexed integer)
    const userId = req.user!.user_id;

    if (selectedOption === undefined || typeof selectedOption !== "number") {
      throw new AppError(400, "selectedOption index is required and must be a number");
    }

    const poll = await prisma.poll.findUnique({
      where: { poll_id: id },
    });

    if (!poll || poll.is_archived) {
      throw new AppError(404, "Active daily poll not found");
    }

    const optionsArray = poll.options as string[];
    if (selectedOption < 0 || selectedOption >= optionsArray.length) {
      throw new AppError(400, "Invalid option selection index");
    }

    // Register vote (unique constraint poll_id + user_id will throw P2002 if user already voted)
    try {
      const vote = await prisma.pollVote.create({
        data: {
          poll_id: id,
          user_id: userId,
          selected_option: selectedOption,
        },
      });

      res.status(201).json({
        status: "success",
        message: "Vote cast successfully",
        vote,
      });
    } catch (err: any) {
      if (err.code === "P2002") {
        throw new AppError(409, "Duplicate vote: You have already voted on this daily poll");
      }
      throw err;
    }
  } catch (error) {
    next(error);
  }
}

export async function getPollResults(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const poll = await prisma.poll.findUnique({
      where: { poll_id: id },
    });

    if (!poll) {
      throw new AppError(404, "Poll not found");
    }

    const optionsArray = poll.options as string[];

    // Group and count votes using Prisma query grouping
    const votesGroup = await prisma.pollVote.groupBy({
      by: ["selected_option"],
      where: { poll_id: id },
      _count: {
        vote_id: true,
      },
    });

    // Compile counts mapping option index -> vote count
    const counts: Record<number, number> = {};
    optionsArray.forEach((_, idx) => {
      counts[idx] = 0;
    });

    let totalVotes = 0;
    votesGroup.forEach((g) => {
      counts[g.selected_option] = g._count.vote_id;
      totalVotes += g._count.vote_id;
    });

    // Map options to results formatting percentages
    const results = optionsArray.map((optionText, idx) => {
      const count = counts[idx] || 0;
      const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      return {
        optionIndex: idx,
        optionText,
        votes: count,
        percentage,
      };
    });

    res.status(200).json({
      status: "success",
      results,
      totalVotes,
    });
  } catch (error) {
    next(error);
  }
}
