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
  @ApiOperation({ summary: 'Tạo bình luận mới (Protected)' })
  @ApiResponse({ status: 201, description: 'Bình luận được tạo thành công', type: Comment })
  @ApiResponse({ status: 401, description: 'Không được phép truy cập' })
  @ResponseMessage('Tạo bình luận thành công')
  async create(@Body() createCommentDto: CreateCommentDto): Promise<Comment> {
    return this.commentService.create(createCommentDto);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy tất cả bình luận (public)' })
  @ApiResponse({
    status: 200,
    description: 'Danh sách bình luận với phân trang',
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
  @ApiOperation({ summary: 'Lấy bình luận theo ID (public)' })
  @ApiResponse({ status: 200, description: 'Bình luận được tìm thấy', type: Comment })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bình luận' })
  @ResponseMessage('Lấy thông tin bình luận thành công') 
  async findOne(@Param('id') id: string): Promise<Comment> {
    return this.commentService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật bình luận theo ID' })
  @ApiResponse({ status: 200, description: 'Bình luận được cập nhật thành công', type: Comment })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bình luận' })
  async updateComment(@Param('id') id: string, @Body() updateCommentDto: UpdateCommentDto): Promise<Comment> {
    return await this.commentService.updateComment(id, updateCommentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa bình luận theo ID' })
  @ApiResponse({ status: 200, description: 'Bình luận được xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bình luận' })
  async deleteComment(@Param('id') id: string): Promise<void> {
    return await this.commentService.deleteComment(id);
  }
}