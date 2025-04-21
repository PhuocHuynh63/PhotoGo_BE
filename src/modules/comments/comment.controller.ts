import { Controller, Get, Post, Body, Query, Param, Res, Put, Delete } from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Comment } from './entities/comment.entity';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FindCommentDto } from './dto/find-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@ApiTags('Comments')
@Controller('comments')
@ApiBearerAuth('access-token')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new comment (Protected)' })
  @ApiResponse({ status: 201, description: 'Comment created successfully', type: Comment })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ResponseMessage('Tạo bình luận thành công')
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
  @ResponseMessage('Lấy danh sách bình luận thành công')
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
  @ResponseMessage('Lấy thông tin bình luận thành công') 
  async findOne(@Param('id') id: string): Promise<Comment> {
    return this.commentService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a comment by ID' })
  @ApiResponse({ status: 200, description: 'Comment updated successfully', type: Comment })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async updateComment(@Param('id') id: string, @Body() updateCommentDto: UpdateCommentDto): Promise<Comment> {
    return await this.commentService.updateComment(id, updateCommentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a comment by ID' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async deleteComment(@Param('id') id: string): Promise<void> {
    return await this.commentService.deleteComment(id);
  }
}