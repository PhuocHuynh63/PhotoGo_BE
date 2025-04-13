import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Comment } from './entities/comment.entity';
import { Public } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FindCommentDto } from './dto/find-comment.dto';

@ApiTags('Comments')
@Controller('comments')
@ApiBearerAuth('access-token')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new comment (Protected)' })
  @ApiResponse({ status: 201, description: 'Comment created successfully', type: Comment })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() createCommentDto: CreateCommentDto): Promise<Comment> {
    return this.commentService.create(createCommentDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all comments (Public)' })
  @ApiResponse({
    status: 200,
    description: 'List of comments with pagination',
    type: [Comment],
  })
  async findAll(@Query() query: FindCommentDto): Promise<{
    data: Comment[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    return this.commentService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a comment by ID (Public)' })
  @ApiResponse({ status: 200, description: 'Comment found', type: Comment })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async findOne(@Param('id') id: string): Promise<Comment> {
    return this.commentService.findOne(id);
  }
}